import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { FileSpreadsheet, Users, Save } from "lucide-react";

interface BusinessUser {
    id: string;
    username: string;
    name?: string;
    email: string;
    role: string;
}

interface Spreadsheet {
    id: string;
    name: string;
    assigned_users: string[];
}

const FormAssignment = () => {
    const { user, token } = useAuth();
    const { toast } = useToast();
    const [users, setUsers] = useState<BusinessUser[]>([]);
    const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
    const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string>("");
    const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, spreadsheetsRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/business/users`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/spreadsheets`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            setUsers(usersRes.data);
            setSpreadsheets(spreadsheetsRes.data);
        } catch (err: any) {
            toast({ title: "Error", description: err.response?.data?.message || "Failed to fetch data", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedSpreadsheetId) {
            const sheet = spreadsheets.find(s => s.id === selectedSpreadsheetId);
            if (sheet) {
                setAssignedUsers(sheet.assigned_users || []);
            }
        } else {
            setAssignedUsers([]);
        }
    }, [selectedSpreadsheetId, spreadsheets]);

    const handleSaveAssignment = async () => {
        if (!selectedSpreadsheetId) return;
        setIsSaving(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/spreadsheets/${selectedSpreadsheetId}/assign`,
                { userIds: assignedUsers },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast({ title: "Success", description: "Assignments updated successfully" });
            fetchData(); // Refresh data to get updated assigned_users
        } catch (err: any) {
            toast({ title: "Error", description: err.response?.data?.message || "Failed to save assignments", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const toggleUser = (userId: string) => {
        if (assignedUsers.includes(userId)) {
            setAssignedUsers(assignedUsers.filter(id => id !== userId));
        } else {
            setAssignedUsers([...assignedUsers, userId]);
        }
    };

    if (user?.role !== "admin") {
        return <div className="p-8 text-center">Unauthorized. Only admins can access this page.</div>;
    }

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Form Assignment</h1>
                <p className="text-muted-foreground">Assign specific forms to your team members.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="glass-card border-slate-800 md:col-span-1">
                    <CardHeader>
                        <CardTitle>Select Form</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Select value={selectedSpreadsheetId} onValueChange={setSelectedSpreadsheetId}>
                            <SelectTrigger className="bg-slate-900/50 border-slate-800">
                                <SelectValue placeholder="Select a spreadsheet" />
                            </SelectTrigger>
                            <SelectContent>
                                {spreadsheets.map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                        <div className="flex items-center gap-2">
                                            <FileSpreadsheet className="h-4 w-4 text-blue-400" />
                                            <span>{s.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Choose a form to see and manage who can access it.</p>
                    </CardContent>
                </Card>

                <Card className="glass-card border-slate-800 md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Assign Users</CardTitle>
                        <Button
                            onClick={handleSaveAssignment}
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={!selectedSpreadsheetId || isSaving}
                        >
                            <Save className="mr-2 h-4 w-4" /> {isSaving ? "Saving..." : "Save Assignments"}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {!selectedSpreadsheetId ? (
                            <div className="py-12 text-center text-muted-foreground">
                                <Users className="h-12 w-12 mx-auto mb-4 opacity-10" />
                                <p>Select a spreadsheet from the left to manage users.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {users.filter(u => u.role !== 'admin').length === 0 ? (
                                    <p className="text-center py-8 text-muted-foreground">No users (non-admins) found in your business.</p>
                                ) : (
                                    users.filter(u => u.role !== 'admin').map(u => (
                                        <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 transition-colors">
                                            <div className="flex items-center space-x-3">
                                                <Checkbox
                                                    id={`user-${u.id}`}
                                                    checked={assignedUsers.includes(u.id)}
                                                    onCheckedChange={() => toggleUser(u.id)}
                                                />
                                                <Label htmlFor={`user-${u.id}`} className="cursor-pointer">
                                                    <p className="font-medium">{u.name || u.username}</p>
                                                    <p className="text-xs text-muted-foreground">{u.email}</p>
                                                </Label>
                                            </div>
                                            <Badge variant={assignedUsers.includes(u.id) ? "default" : "outline"} className={assignedUsers.includes(u.id) ? "bg-blue-600/20 text-blue-400 border-blue-600/30" : "border-slate-800"}>
                                                {assignedUsers.includes(u.id) ? "Assigned" : "Unassigned"}
                                            </Badge>
                                        </div>
                                    ))
                                )}
                                <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-500/10 mt-6">
                                    <p className="text-xs text-blue-400">Note: Admins have access to all forms by default and cannot be individually assigned.</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default FormAssignment;
