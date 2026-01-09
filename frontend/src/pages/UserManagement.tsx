import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableHeader, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, ShieldCheck, User as UserIcon, KeyRound } from "lucide-react";

interface BusinessUser {
    id: string;
    username: string;
    name?: string; // Display name
    email: string;
    role: string;
    permissions: string[];
    plain_password?: string;
}

const UserManagement = () => {
    const { user, token } = useAuth();
    const { toast } = useToast();
    const [users, setUsers] = useState<BusinessUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newUser, setNewUser] = useState({ name: "", email: "", password: "" });
    const [selectedUserPermissions, setSelectedUserPermissions] = useState<{ userId: string, permissions: string[] } | null>(null);

    const availablePermissions = [
        { id: "dashboard", label: "Calling Dashboard" },
        { id: "poster", label: "Poster Generator" },
        { id: "webhooks", label: "Webhook/Meta Settings" }
    ];

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/api/auth/business/users');
            setUsers(res.data);
        } catch (err: any) {
            toast({ title: "Error", description: err.response?.data?.message || "Failed to fetch users", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/api/auth/business/users', newUser);
            toast({ title: "Success", description: "User created successfully" });
            setIsCreateOpen(false);
            setNewUser({ name: "", email: "", password: "" });
            fetchUsers();
        } catch (err: any) {
            toast({ title: "Error", description: err.response?.data?.message || "Failed to create user", variant: "destructive" });
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm("Are you sure you want to delete this user?")) return;
        try {
            await api.delete(`/api/auth/business/users/${id}`);
            toast({ title: "Success", description: "User deleted successfully" });
            fetchUsers();
        } catch (err: any) {
            toast({ title: "Error", description: err.response?.data?.message || "Failed to delete user", variant: "destructive" });
        }
    };

    const handleUpdatePermissions = async () => {
        if (!selectedUserPermissions) return;
        try {
            await api.put(`/api/auth/business/users/${selectedUserPermissions.userId}/permissions`,
                { permissions: selectedUserPermissions.permissions }
            );
            toast({ title: "Success", description: "Permissions updated successfully" });
            setSelectedUserPermissions(null);
            fetchUsers();
        } catch (err: any) {
            toast({ title: "Error", description: err.response?.data?.message || "Failed to update permissions", variant: "destructive" });
        }
    };

    const [selectedUserForReset, setSelectedUserForReset] = useState<{ userId: string, username: string, plain_password?: string } | null>(null);
    const [resetPasswordValue, setResetPasswordValue] = useState("");

    const handleResetPassword = async () => {
        if (!selectedUserForReset || !resetPasswordValue) return;
        try {
            await api.post(`/api/auth/business/users/${selectedUserForReset.userId}/reset-password`,
                { password: resetPasswordValue }
            );
            toast({ title: "Success", description: "Password reset successfully" });
            setSelectedUserForReset(null);
            setResetPasswordValue("");
        } catch (err: any) {
            toast({ title: "Error", description: err.response?.data?.message || "Failed to reset password", variant: "destructive" });
        }
    };

    const togglePermission = (permId: string) => {
        if (!selectedUserPermissions) return;
        const current = [...selectedUserPermissions.permissions];
        if (current.includes(permId)) {
            setSelectedUserPermissions({ ...selectedUserPermissions, permissions: current.filter(p => p !== permId) });
        } else {
            setSelectedUserPermissions({ ...selectedUserPermissions, permissions: [...current, permId] });
        }
    };

    if (user?.role !== "admin") {
        return <div className="p-8 text-center">Unauthorized. Only admins can access this page.</div>;
    }

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">User Management</h1>
                    <p className="text-muted-foreground">Manage your business users and their access levels.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="mr-2 h-4 w-4" /> Add User
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-card">
                        <DialogHeader>
                            <DialogTitle>Create New User</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Initial Password</Label>
                                <Input id="password" type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
                            </div>
                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Create User</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="glass-card border-border">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-border">
                                <TableHead>User</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Permissions</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
                            ) : users.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8">No users found.</TableCell></TableRow>
                            ) : users.map(u => (
                                <TableRow key={u.id} className="border-border hover:bg-accent/40">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                                <UserIcon className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{u.name || u.username}</p>
                                                <p className="text-xs text-muted-foreground">{u.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                                            {u.role.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {u.permissions.map(p => (
                                                <Badge key={p} variant="outline" className="text-[10px] py-0 border-border">
                                                    {p}
                                                </Badge>
                                            ))}
                                            {u.permissions.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => setSelectedUserForReset({ userId: u.id, username: u.username, plain_password: u.plain_password })} className="text-orange-400 hover:text-orange-300 hover:bg-orange-400/10" title="Reset/View Password">
                                                <KeyRound className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setSelectedUserPermissions({ userId: u.id, permissions: u.permissions })} className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10" title="Edit Permissions">
                                                <ShieldCheck className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.id)} disabled={u.id === user?.id} className="text-red-400 hover:text-red-300 hover:bg-red-400/10" title="Delete User">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={!!selectedUserPermissions} onOpenChange={(open) => !open && setSelectedUserPermissions(null)}>
                <DialogContent className="glass-card">
                    <DialogHeader>
                        <DialogTitle>Update Permissions</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 pt-4">
                        <div className="space-y-4">
                            {availablePermissions.map(p => (
                                <div key={p.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={p.id}
                                        checked={selectedUserPermissions?.permissions.includes(p.id)}
                                        onCheckedChange={() => togglePermission(p.id)}
                                    />
                                    <Label htmlFor={p.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                        {p.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                        <Button onClick={handleUpdatePermissions} className="w-full bg-blue-600 hover:bg-blue-700">Save Permissions</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!selectedUserForReset} onOpenChange={(open) => !open && setSelectedUserForReset(null)}>
                <DialogContent className="glass-card">
                    <DialogHeader>
                        <DialogTitle>Reset Password for {selectedUserForReset?.username}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label>Current Password</Label>
                            <div className="p-3 bg-muted/50 rounded-md border border-border text-sm font-mono text-muted-foreground break-all">
                                {selectedUserForReset?.plain_password || <span className="italic text-muted-foreground/60">Not recorded (old user)</span>}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reset-password">New Password</Label>
                            <Input
                                id="reset-password"
                                type="password"
                                value={resetPasswordValue}
                                onChange={e => setResetPasswordValue(e.target.value)}
                                placeholder="Enter new password to override"
                                className="bg-background border-input"
                            />
                        </div>
                        <Button onClick={handleResetPassword} className="w-full bg-orange-600 hover:bg-orange-700">Reset Password</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default UserManagement;
