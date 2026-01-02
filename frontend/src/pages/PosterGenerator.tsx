import { useState, useEffect, useRef } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Text } from "react-konva";
import { useAuth } from "@/context/AuthContext";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { Save, Download, ImagePlus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

// Helper for API calls
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000" });
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

const PosterGenerator = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();

    // State
    const [companies, setCompanies] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);

    // Company Form
    const [companyName, setCompanyName] = useState("");
    const [companyPhone, setCompanyPhone] = useState("");
    const [companyAddress, setCompanyAddress] = useState("");
    const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
    const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
    const [isSavingCompany, setIsSavingCompany] = useState(false);

    // Template Builder
    const [templateName, setTemplateName] = useState("");
    const [posterFile, setPosterFile] = useState<File | null>(null);
    const [posterImage, setPosterImage] = useState<HTMLImageElement | null>(null);
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    // Dynamic canvas dimensions
    const [stageSize, setStageSize] = useState({ width: 600, height: 600 });

    // Default placeholders
    const defaultPlaceholders = {
        logo: { x: 50, y: 50 },
        phone: { x: 50, y: 150 },
        address: { x: 50, y: 180 },
    };

    const [placeholders, setPlaceholders] = useState(defaultPlaceholders);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);

    // Preview & Export
    const [selectedCompanyId, setSelectedCompanyId] = useState("");
    const [selectedTemplateId, setSelectedTemplateId] = useState("");
    const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
    const [finalPoster, setFinalPoster] = useState<HTMLImageElement | null>(null);
    // Preview stage size
    const [previewStageSize, setPreviewStageSize] = useState({ width: 600, height: 600 });
    const finalStageRef = useRef<any>(null);

    // Fetch Data
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            console.log("Fetching data...");
            const [compRes, tempRes] = await Promise.all([
                api.get("/api/companies"),
                api.get("/api/templates")
            ]);
            console.log("Fetched companies:", compRes.data.companies);
            console.log("Fetched templates:", tempRes.data.templates);
            setCompanies(compRes.data.companies || []);
            setTemplates(tempRes.data.templates || []);
        } catch (error) {
            console.error("Failed to fetch data", error);
            toast({ title: "Failed to load data", variant: "destructive" });
        }
    };

    // Effects for Preview
    useEffect(() => {
        if (!selectedCompanyId) {
            setLogoImage(null);
            return;
        }
        const company = companies.find((c) => c._id === selectedCompanyId || c.id === selectedCompanyId);
        if (company?.logo) {
            const img = new window.Image();
            img.src = company.logo;
            img.onload = () => setLogoImage(img);
        }
    }, [selectedCompanyId, companies]);

    useEffect(() => {
        if (!selectedTemplateId) {
            setFinalPoster(null);
            return;
        }
        const template = templates.find((t) => t._id === selectedTemplateId || t.id === selectedTemplateId);
        if (template?.poster) {
            const img = new window.Image();
            img.src = template.poster;
            img.onload = () => {
                setFinalPoster(img);
                // Calculate dynamic aspect ratio for preview
                const maxDim = 600;
                const ratio = img.width / img.height;
                let newW = maxDim;
                let newH = maxDim;

                if (ratio > 1) {
                    // Wider
                    newH = maxDim / ratio;
                } else {
                    // Taller
                    newW = maxDim * ratio;
                }
                setPreviewStageSize({ width: newW, height: newH });
            };
        }
    }, [selectedTemplateId, templates]);

    // Handle Edit Company
    const handleEditCompany = (company: any) => {
        setEditingCompanyId(company._id || company.id);
        setCompanyName(company.name);
        setCompanyPhone(company.phone);
        setCompanyAddress(company.address);
        setCompanyLogoFile(null); // Keep existing unless changed
    };

    const handleCancelEditCompany = () => {
        setEditingCompanyId(null);
        setCompanyName("");
        setCompanyPhone("");
        setCompanyAddress("");
        setCompanyLogoFile(null);
    };

    const handleSaveCompany = async () => {
        if (!companyName || !companyPhone || !companyAddress) {
            toast({ title: "Please fill all fields", variant: "destructive" });
            return;
        }
        if (!editingCompanyId && !companyLogoFile) {
            toast({ title: "Logo is required for new company", variant: "destructive" });
            return;
        }

        setIsSavingCompany(true);

        const save = async (logoData: string | null) => {
            try {
                const payload: any = {
                    name: companyName,
                    phone: companyPhone,
                    address: companyAddress,
                };
                if (logoData) payload.logo = logoData;

                if (editingCompanyId) {
                    await api.put(`/api/companies/${editingCompanyId}`, payload);
                    toast({ title: "Company updated successfully!" });
                } else {
                    await api.post("/api/companies", payload);
                    toast({ title: "Company saved successfully!" });
                }

                handleCancelEditCompany();
                fetchData();
            } catch (error: any) {
                console.error(error);
                toast({
                    title: "Failed to save company",
                    description: error.response?.data?.message || error.message || "Unknown error",
                    variant: "destructive"
                });
            } finally {
                setIsSavingCompany(false);
            }
        };

        if (companyLogoFile) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                await save(reader.result as string);
            };
            reader.readAsDataURL(companyLogoFile);
        } else {
            await save(null);
        }
    };

    // Handle Edit Template
    const handleEditTemplate = (template: any) => {
        setEditingTemplateId(template._id || template.id);
        setTemplateName(template.name || "");
        setPlaceholders(template.placeholders);
        setPosterFile(null);

        // Load existing poster to stage
        const img = new window.Image();
        img.src = template.poster;
        img.onload = () => {
            setPosterImage(img);
            // Recalculate stage size for existing image
            const maxDim = 600;
            const ratio = img.width / img.height;
            let newW = maxDim;
            let newH = maxDim;
            if (ratio > 1) {
                newH = maxDim / ratio;
            } else {
                newW = maxDim * ratio;
            }
            setStageSize({ width: newW, height: newH });
        };
    };

    const handleCancelEditTemplate = () => {
        setEditingTemplateId(null);
        setTemplateName("");
        setPosterFile(null);
        setPosterImage(null);
        setPlaceholders(defaultPlaceholders);
        setStageSize({ width: 600, height: 600 });
    };

    const handleSaveTemplate = async () => {
        if (!templateName) {
            toast({ title: "Please enter a template name", variant: "destructive" });
            return;
        }
        if (!editingTemplateId && !posterFile) {
            toast({ title: "Please upload a poster image", variant: "destructive" });
            return;
        }

        setIsSavingTemplate(true);

        const saveKey = async (posterData: string | null) => {
            try {
                const payload: any = {
                    name: templateName,
                    placeholders,
                };
                if (posterData) payload.poster = posterData;

                if (editingTemplateId) {
                    await api.put(`/api/templates/${editingTemplateId}`, payload);
                    toast({ title: "Template updated successfully!" });
                } else {
                    await api.post("/api/templates", payload);
                    toast({ title: "Template saved successfully!" });
                }

                handleCancelEditTemplate();
                fetchData();
            } catch (error: any) {
                console.error(error);
                toast({
                    title: "Failed to save template",
                    description: error.response?.data?.message || error.message || "Unknown error",
                    variant: "destructive"
                });
            } finally {
                setIsSavingTemplate(false);
            }
        };

        if (posterFile) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                await saveKey(reader.result as string);
            };
            reader.readAsDataURL(posterFile);
        } else {
            await saveKey(null);
        }
    };

    const handlePosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setPosterFile(f);
        const img = new window.Image();
        img.src = URL.createObjectURL(f);
        img.onload = () => {
            setPosterImage(img);
            // Dynamic sizing logic
            const maxDim = 600; // max width or height
            const ratio = img.width / img.height;
            let newW = maxDim;
            let newH = maxDim;

            if (ratio > 1) {
                // Wider than tall: Width = 600, Height = 600 / ratio
                newH = maxDim / ratio;
            } else {
                // Taller or square: Height = 600, Width = 600 * ratio
                newW = maxDim * ratio;
            }
            setStageSize({ width: newW, height: newH });
        };
    };

    const handleCompanyLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setCompanyLogoFile(e.target.files[0]);
        }
    };

    const downloadPoster = () => {
        if (finalStageRef.current) {
            const uri = finalStageRef.current.toDataURL({ pixelRatio: 3 }); // Higher quality export
            const link = document.createElement("a");
            link.download = "poster.jpg";
            link.href = uri;
            link.click();
        }
    };

    return (
        <SidebarProvider>
            <AppSidebar />

            <SidebarInset className="bg-background relative overflow-hidden">
                {/* Background effects */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light pointer-events-none"></div>

                <header className="sticky top-0 z-50 flex h-16 w-full items-center gap-4 border-b border-border/40 bg-background/60 backdrop-blur-xl px-4 shadow-sm">
                    <SidebarTrigger />
                    <div className="flex-1">
                        <h1 className="text-lg font-semibold">Poster Generator</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-full border border-border/50">
                            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                {user?.username?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium hidden md:block">{user?.username}</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-6 md:p-8 pt-6 relative z-10 animate-fade-in text-left">
                    <Tabs defaultValue="companies" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 max-w-md mb-8">
                            <TabsTrigger value="companies">Companies</TabsTrigger>
                            <TabsTrigger value="templates">Templates</TabsTrigger>
                            <TabsTrigger value="preview">Preview & Export</TabsTrigger>
                        </TabsList>

                        <TabsContent value="companies">
                            <Card className="border-border/50 bg-card/60 backdrop-blur-md">
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <CardTitle>{editingCompanyId ? "Edit Company" : "Manage Companies"}</CardTitle>
                                            <CardDescription>{editingCompanyId ? "Update existing company details." : "Add company details to be used in posters."}</CardDescription>
                                        </div>
                                        {editingCompanyId && (
                                            <Button variant="outline" size="sm" onClick={handleCancelEditCompany}>Cancel Edit</Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="companyName">Company Name</Label>
                                            <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Acme Corp" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone Number</Label>
                                            <Input id="phone" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="+1 234 567 8900" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="address">Address</Label>
                                            <Input id="address" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="123 Main St, City" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="logo">Logo {editingCompanyId && "(Optional to replace)"}</Label>
                                            <div className="flex items-center gap-2">
                                                <Input id="logo" type="file" onChange={handleCompanyLogoUpload} className="cursor-pointer" />
                                            </div>
                                        </div>
                                    </div>
                                    <Button onClick={handleSaveCompany} disabled={isSavingCompany} className="mt-4">
                                        {isSavingCompany ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> {editingCompanyId ? "Update Company" : "Save Company"}</>}
                                    </Button>

                                    {companies.length > 0 && (
                                        <div className="mt-8">
                                            <h3 className="font-semibold mb-4">Your Companies</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {companies.map((company) => (
                                                    <div key={company._id || company.id} className="p-4 rounded-lg bg-secondary/50 border border-border/50 flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4">
                                                            <img src={company.logo} alt={company.name} className="h-10 w-10 rounded object-contain bg-white" />
                                                            <div>
                                                                <p className="font-medium">{company.name}</p>
                                                                <p className="text-xs text-muted-foreground">{company.phone}</p>
                                                            </div>
                                                        </div>
                                                        <Button variant="ghost" size="sm" onClick={() => handleEditCompany(company)}>Edit</Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="templates">
                            <Card className="border-border/50 bg-card/60 backdrop-blur-md">
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <CardTitle>{editingTemplateId ? "Edit Template" : "Template Builder"}</CardTitle>
                                            <CardDescription>Upload a poster design and define placeholder positions.</CardDescription>
                                        </div>
                                        {editingTemplateId && (
                                            <Button variant="outline" size="sm" onClick={handleCancelEditTemplate}>Cancel Edit</Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="templateName">Template Name</Label>
                                            <Input id="templateName" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. Sales Flyer" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Upload Poster Image {editingTemplateId && "(Optional to replace)"}</Label>
                                            <Input type="file" onChange={handlePosterUpload} />
                                        </div>
                                    </div>

                                    {posterImage && (
                                        <div className="mt-6 border rounded-xl overflow-hidden shadow-lg bg-black/5 dark:bg-black/20 max-w-fit mx-auto">
                                            <Stage width={stageSize.width} height={stageSize.height}>
                                                <Layer>
                                                    <KonvaImage image={posterImage} width={stageSize.width} height={stageSize.height} />
                                                    <Rect
                                                        {...placeholders.logo}
                                                        width={80}
                                                        height={80}
                                                        stroke="#6366F1"
                                                        strokeWidth={2}
                                                        draggable
                                                        onDragEnd={(e) => setPlaceholders({ ...placeholders, logo: { x: e.target.x(), y: e.target.y() } })}
                                                    />
                                                    <Text
                                                        text="PHONE"
                                                        {...placeholders.phone}
                                                        fontSize={20}
                                                        fill="red"
                                                        draggable
                                                        onDragEnd={(e) => setPlaceholders({ ...placeholders, phone: { x: e.target.x(), y: e.target.y() } })}
                                                    />
                                                    <Text
                                                        text="ADDRESS"
                                                        {...placeholders.address}
                                                        fontSize={16}
                                                        fill="blue"
                                                        draggable
                                                        onDragEnd={(e) => setPlaceholders({ ...placeholders, address: { x: e.target.x(), y: e.target.y() } })}
                                                    />
                                                </Layer>
                                            </Stage>
                                        </div>
                                    )}
                                    {posterImage && (
                                        <div className="flex justify-center mt-4">
                                            <Button onClick={handleSaveTemplate} disabled={isSavingTemplate}>
                                                {isSavingTemplate ? "Saving..." : "Save Template"}
                                            </Button>
                                        </div>
                                    )}

                                    {/* Simple List of Existing Templates to Verify They Exists */}
                                    {templates.length > 0 && (
                                        <div className="mt-8 pt-6 border-t border-border/40">
                                            <h3 className="font-semibold mb-4">Saved Templates</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                {templates.map((t, idx) => (
                                                    <div key={t._id || t.id} className="p-2 border rounded-lg text-center text-xs">
                                                        <img src={t.poster} className="w-full h-24 object-cover mb-2 rounded" alt="Mini preview" />
                                                        Template {idx + 1}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="preview">
                            <Card className="border-border/50 bg-card/60 backdrop-blur-md">
                                <CardHeader>
                                    <CardTitle>Generate Poster</CardTitle>
                                    <CardDescription>Select a company and a template to generate the final poster.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 md:items-end gap-6">
                                        <div className="space-y-2">
                                            <Label>Select Template</Label>
                                            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a template" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {templates.map((t, idx) => (
                                                        <SelectItem key={t._id || t.id} value={t._id || t.id}>{t.name || `Template ${idx + 1}`}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Select Company</Label>
                                            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a company" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {companies.map((c) => (
                                                        <SelectItem key={c._id || c.id} value={c._id || c.id}>{c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {finalPoster && logoImage && selectedCompanyId && selectedTemplateId && (
                                        <div className="flex flex-col items-center gap-6 mt-8">
                                            <div className="border rounded-xl overflow-hidden shadow-2xl">
                                                <Stage width={previewStageSize.width} height={previewStageSize.height} ref={finalStageRef}>
                                                    <Layer>
                                                        <KonvaImage image={finalPoster} width={previewStageSize.width} height={previewStageSize.height} />
                                                        {(() => {
                                                            const tmpl = templates.find(t => (t._id || t.id) === selectedTemplateId);
                                                            const comp = companies.find(c => (c._id || c.id) === selectedCompanyId);
                                                            if (!tmpl || !comp) return null;
                                                            return (
                                                                <>
                                                                    <KonvaImage
                                                                        image={logoImage}
                                                                        {...tmpl.placeholders.logo}
                                                                        width={80}
                                                                        height={80}
                                                                    />
                                                                    <Text
                                                                        text={comp.phone}
                                                                        {...tmpl.placeholders.phone}
                                                                        fontSize={20}
                                                                        fontStyle="bold"
                                                                        fill="black"
                                                                    />
                                                                    <Text
                                                                        text={comp.address}
                                                                        {...tmpl.placeholders.address}
                                                                        fontSize={16}
                                                                        fill="black"
                                                                    />
                                                                </>
                                                            );
                                                        })()}
                                                    </Layer>
                                                </Stage>
                                            </div>
                                            <Button onClick={downloadPoster} size="lg" className="shadow-lg shadow-primary/20">
                                                <Download className="mr-2 h-5 w-5" /> Download Poster
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
};

export default PosterGenerator;
