import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Mic, Sparkles, Zap, Users } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-hero">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Heading */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight animate-scale-in">
            Create Your Voice
            <br />
            <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              Profile
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto animate-fade-in">
            Make user profile fun again, with voice
          </p>

          {/* CTA Button */}
          <Button
            onClick={() => navigate("/onboarding")}
            size="lg"
            className="text-lg px-8 py-6 rounded-full shadow-glow gradient-primary hover:scale-105 transition-transform animate-pulse-glow"
          >
            <Mic className="w-6 h-6 mr-2" />
            Let's talk
          </Button>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-4xl mx-auto">
            {[
              {
                icon: Mic,
                title: "Voice-Powered",
                description: "Simply speak your answers - no typing required",
              },
              {
                icon: Zap,
                title: "Lightning Fast",
                description: "Complete your profile in under 2 minutes",
              },
              {
                icon: Users,
                title: "Personalized",
                description: "Get matched with relevant talks and people",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors animate-scale-in"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-full gradient-accent flex items-center justify-center mb-4 mx-auto">
                  <feature.icon className="w-6 h-6 text-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent/10 blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }} />
      </div>
    </div>
  );
};

export default Index;
