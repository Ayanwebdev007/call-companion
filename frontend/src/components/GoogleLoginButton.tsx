import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const GoogleLoginButton = () => {
    const { login } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleSuccess = async (credentialResponse: any) => {
        try {
            const { credential } = credentialResponse;
            const res = await axios.post(`${API_BASE_URL}/api/auth/google-login`, { credential });

            login(res.data.token, res.data.user);
            toast({
                title: "Success",
                description: "Logged in with Google successfully",
            });
            navigate('/');
        } catch (err: any) {
            console.error("[Google Login Error]:", err);
            const status = err.response?.status;
            const message = err.response?.data?.message || "Google login failed";

            if (status === 404) {
                toast({
                    variant: "destructive",
                    title: "Account Not Found",
                    description: "No account is associated with this Google email. Please register your business account first.",
                });
                if (window.location.pathname === '/login') {
                    navigate('/register');
                }
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: message,
                });
            }
        }
    };

    return (
        <div className="flex justify-center w-full max-w-[300px] mx-auto overflow-hidden rounded-md">
            <div className="w-full flex justify-center translate-y-[2px]">
                <GoogleLogin
                    onSuccess={handleSuccess}
                    onError={() => {
                        toast({
                            variant: "destructive",
                            title: "Error",
                            description: "Google login was unsuccessful. Please try again.",
                        });
                    }}
                    useOneTap
                    theme="filled_blue"
                    shape="rectangular"
                    width="300"
                    size="large"
                    text="continue_with"
                />
            </div>
        </div>
    );
};
