import DocumentTracker from '../DocumentTracker';
import { mockClients } from '@/lib/mockData';

export default function DocumentTrackerExample() {
  return (
    <div className="p-6">
      <DocumentTracker documents={mockClients[0].clinicalDocuments} />
    </div>
  );
}
