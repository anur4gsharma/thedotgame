import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", color: "#fff", background: "#1a1a1a", height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <h1 style={{ color: "#ff4444", marginBottom: "1rem" }}>Something went wrong.</h1>
          <pre style={{ background: "#000", padding: "1rem", borderRadius: "8px", maxWidth: "80vw", overflow: "auto" }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: "2rem", padding: "0.5rem 1rem", fontSize: "1rem", cursor: "pointer" }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
