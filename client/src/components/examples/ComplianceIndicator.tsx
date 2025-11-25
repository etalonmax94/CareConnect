import ComplianceIndicator from '../ComplianceIndicator';

export default function ComplianceIndicatorExample() {
  return (
    <div className="flex gap-3 p-6 flex-wrap">
      <ComplianceIndicator status="compliant" />
      <ComplianceIndicator status="due-soon" />
      <ComplianceIndicator status="overdue" />
      <ComplianceIndicator status="none" />
    </div>
  );
}
