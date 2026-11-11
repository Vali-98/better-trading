import { Component, type ReactNode } from 'react'
import { reportIntegrationIssue } from '../integrations/diagnostics'

export class FeatureBoundary extends Component<
    { children: ReactNode; name: string },
    { failed: boolean }
> {
    override state = { failed: false }
    static getDerivedStateFromError() {
        return { failed: true }
    }
    override componentDidCatch() {
        reportIntegrationIssue('panel', `${this.props.name} could not be displayed`)
    }
    override render() {
        if (!this.state.failed) return this.props.children
        return (
            <div role="alert" className="bt-notice">
                This section could not be displayed. Other sections and the trade site are still
                available.{' '}
                <button className="bt-button" onClick={() => this.setState({ failed: false })}>
                    Try again
                </button>
            </div>
        )
    }
}
