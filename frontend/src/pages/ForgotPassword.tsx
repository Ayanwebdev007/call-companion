import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { forgotPassword } from "@/lib/api";
import { KeyRound, ArrowLeft, Mail } from "lucide-react";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsLoading(true);
        try {
            const data = await forgotPassword(email);
            setIsSubmitted(true);
            if (data.devMode) {
                toast({
                    title: "Development Mode",
                    description: "Reset link logged to server console.",
                });
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to send reset link",
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
                        <KeyRound className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Forgot password?</CardTitle>
                    <CardDescription>
                        {isSubmitted
                            ? "No problem, we've sent you reset instructions."
                            : "No worries, we'll send you reset instructions."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!isSubmitted ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? "Sending..." : "Reset password"}
                            </Button>
                        </form>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground">
                                We've sent an email to <span className="font-medium text-foreground">{email}</span> with instructions to reset your password.
                            </p>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button variant="ghost" asChild className="w-full">
                        <Link to="/login" className="flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Back to log in
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default ForgotPassword;
