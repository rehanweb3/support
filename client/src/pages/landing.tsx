import { Button } from "@/components/ui/button";
import { MessageSquare, Zap, Shield, CheckCircle } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-bg opacity-10"></div>
        
        <header className="relative container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="gradient-bg rounded-lg p-2">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold">Mintrax AI</span>
            </div>
            <Button
              onClick={() => window.location.href = "/login"}
              data-testid="button-login"
            >
              Sign In
            </Button>
          </div>
        </header>

        <section className="relative container mx-auto px-6 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Intelligent Support,
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Powered by AI
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience next-generation customer support with Gemini AI. Get instant answers, 
              manage tickets seamlessly, and resolve issues faster than ever before.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => window.location.href = "/signup"}
                className="gradient-bg"
                data-testid="button-get-started"
              >
                Get Started Free
              </Button>
              <Button size="lg" variant="outline" data-testid="button-learn-more">
                Learn More
              </Button>
            </div>
          </div>
        </section>
      </div>

      <section className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-4 p-6 rounded-lg bg-card border border-border">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Instant AI Responses</h3>
            <p className="text-muted-foreground">
              Get immediate answers from our Gemini-powered AI assistant with context-aware responses 
              based on your conversation history.
            </p>
          </div>

          <div className="space-y-4 p-6 rounded-lg bg-card border border-border">
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold">Seamless Ticket Management</h3>
            <p className="text-muted-foreground">
              Create, track, and manage support tickets effortlessly. View detailed conversation 
              threads and admin replies in one place.
            </p>
          </div>

          <div className="space-y-4 p-6 rounded-lg bg-card border border-border">
            <div className="w-12 h-12 rounded-lg bg-chart-4/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-chart-4" />
            </div>
            <h3 className="text-xl font-semibold">Real-time Updates</h3>
            <p className="text-muted-foreground">
              Stay informed with instant notifications for ticket updates, admin replies, 
              and important system alerts.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-20">
        <div className="max-w-3xl mx-auto text-center space-y-8 p-12 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
          <h2 className="text-4xl font-bold">Ready to transform your support experience?</h2>
          <p className="text-lg text-muted-foreground">
            Join thousands of users who trust Mintrax AI for intelligent, responsive customer support.
          </p>
          <Button
            size="lg"
            onClick={() => window.location.href = "/signup"}
            className="gradient-bg"
            data-testid="button-start-now"
          >
            Start Now - It's Free
          </Button>
        </div>
      </section>

      <footer className="border-t border-border mt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="gradient-bg rounded-lg p-2">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold">Mintrax AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Mintrax AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
