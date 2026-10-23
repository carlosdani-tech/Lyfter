import { Component } from "react";
import { useLocation } from "react-router-dom";
import RouteStatusPage from "./RouteStatusPage";

// Retain no exception object: errors may contain credentials or buyer snapshots.
export class RenderBoundary extends Component {
  state = { failed: false, resetKey: this.props.resetKey };

  static getDerivedStateFromProps(props, state) {
    return props.resetKey !== state.resetKey ? { failed: false, resetKey: props.resetKey } : null;
  }

  static getDerivedStateFromError() { return { failed: true }; }

  render() {
    return this.state.failed ? <RouteStatusPage title="No se pudo mostrar esta página"
      message="Ocurrió un problema al mostrar el contenido. Puedes continuar navegando." /> : this.props.children;
  }
}

export default function RouteErrorBoundary({ children }) {
  const location = useLocation();
  // Recover on navigation without remounting healthy pages and discarding forms.
  return <RenderBoundary resetKey={`${location.key}:${location.pathname}:${location.search}`}>{children}</RenderBoundary>;
}
