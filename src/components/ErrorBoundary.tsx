import { Component, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary fangede en fejl:", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Card className="max-w-xl mx-auto mt-12 shadow-card">
        <CardContent className="pt-6 space-y-4 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-warning" />
          <h2 className="text-lg font-semibold">Noget gik galt på denne side</h2>
          <p className="text-sm text-muted-foreground">
            Vi kunne ikke vise indholdet. Prøv igen, eller gå tilbage til biblioteket.
          </p>
          <details className="text-left text-xs bg-muted rounded p-3">
            <summary className="cursor-pointer">Tekniske detaljer</summary>
            <pre className="whitespace-pre-wrap mt-2">{this.state.error.message}</pre>
          </details>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => { this.reset(); window.location.href = "/library"; }}>
              <ArrowLeft className="mr-2 h-4 w-4" />Tilbage til bibliotek
            </Button>
            <Button onClick={() => { this.reset(); window.location.reload(); }}>
              <RotateCcw className="mr-2 h-4 w-4" />Prøv igen
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
}