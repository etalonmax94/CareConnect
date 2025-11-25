import ClientTable from '../ClientTable';
import { mockClients } from '@/lib/mockData';

export default function ClientTableExample() {
  const handleViewClient = (client: any) => {
    console.log('View client:', client.participantName);
  };

  return (
    <div className="p-6">
      <ClientTable clients={mockClients} onViewClient={handleViewClient} />
    </div>
  );
}
