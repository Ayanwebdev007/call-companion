import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Phone } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/register`, { username, password });
      login(res.data.token, res.data.user);
      toast({
        title: "Success",
        description: "Account created successfully",
      });
      navigate('/');
    } catch (err: unknown) {
      let errorMessage = "Registration failed";
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.message || err.message || "Registration failed";
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="hidden bg-muted lg:block relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/90" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white p-12 text-center">
          <h2 className="text-4xl font-bold mb-4">Join the community</h2>
          <p className="text-lg text-primary-foreground/80 max-w-md">
            Create an account today and start organizing your customer calls like a pro.
          </p>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl" />
      </div>
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-[350px] gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="p-3 bg-primary/10 rounded-full">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Create an account</h1>
            <p className="text-balance text-muted-foreground">
              Enter your information to get started
            </p>
          </div>
          <Card className="border-0 shadow-none sm:border sm:shadow-sm">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit}>
                <div className="grid w-full items-center gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="username">Username</Label>
                    <Input 
                      id="username" 
                      placeholder="Choose a username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="h-10"
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password"
                      placeholder="Choose a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-10"
                    />
                  </div>
                  <Button className="w-full h-10 mt-2" type="submit" disabled={loading}>
                    {loading ? "Creating account..." : "Register"}
                  </Button>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center border-t p-4 sm:p-6">
              <p className="text-sm text-muted-foreground">
                Already have an account? <Link to="/login" className="text-primary hover:underline font-medium">Login</Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Register;