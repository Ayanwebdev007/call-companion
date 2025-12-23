import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { resetPassword } from "@/lib/api";
import { Lock, ArrowLeft, CheckCircle2 } from "lucide-react";

const ResetPassword = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        if (password !== confirmPassword) {
            toast({
                title: "Error",
                description: "Passwords do not match",
                variant: "destructive",
            });
            return;
        }

        if (password.length < 6) {
            toast({
                title: "Error",
                description: "Password must be at least 6 characters",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            await resetPassword(token, password);
            setIsSuccess(true);
            toast({
                title: "Success",
                description: "Password reset successfully",
            });
            setTimeout(() => navigate("/login"), 3000);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to reset password",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 flex flex-col items-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2 text-primary">
                        <Lock className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Set new password</CardTitle>
                    <CardDescription>
                        {isSuccess
                            ? "Your password has been successfully reset."
                            : "Your new password must be different from previous used passwords."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!isSuccess ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">New Password</label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Confirm New Password</label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? "Resetting..." : "Reset password"}
                            </Button>
                        </form>
                    ) : (
                        <div className="flex flex-col items-center gap-4 py-4 text-center">
                            <CheckCircle2 className="w-12 h-12 text-green-500" />
                            <p className="text-sm text-muted-foreground">
                                Password reset successfully. Redirecting you to the login page...
                            </p>
                        </div>
                    )}
                </CardContent>
                {!isSuccess && (
                    <CardFooter>
                        <Button variant="ghost" asChild className="w-full">
                            <Link to="/login" className="flex items-center gap-2">
                                <ArrowLeft className="w-4 h-4" />
                                Back to log in
                            </Link>
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
};

export default ResetPassword;
