import { Component } from 'react';
import type { ReactNode } from 'react';
import { useErrorKeyboard } from './use-error-keyboard';

type Props = { children: ReactNode; onError?: (error: unknown) => void; logPath?: string };

const ErrorScreen = ({ logPath }: { logPath?: string }) => {
    useErrorKeyboard();

    return (
        <box flexDirection="column" padding={1}>
            <text fg="red">Pond encountered an unexpected error.</text>
            <text>The workspace has stopped. Pending edits have not been saved.</text>
            <text>{logPath ? `Log location (if writable): ${logPath}` : 'Diagnostic logging is unavailable.'}</text>
            <text>Press q or Ctrl+C to exit.</text>
        </box>
    );
};

export class ErrorBoundary extends Component<Props, { failed: boolean }> {
    override state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    override componentDidCatch(error: unknown) {
        this.props.onError?.(error);
    }

    override render() {
        return this.state.failed ? <ErrorScreen logPath={this.props.logPath} /> : this.props.children;
    }
}
