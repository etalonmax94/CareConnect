import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ClientLocationMapProps {
  latitude?: string | null;
  longitude?: string | null;
  address?: string | null;
  clientName: string;
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
}

export default function ClientLocationMap({ 
  latitude, 
  longitude, 
  address,
  clientName 
}: ClientLocationMapProps) {
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        setCoordinates([lat, lng]);
        setError(null);
        return;
      }
    }

    if (address) {
      setIsLoading(true);
      const encodedAddress = encodeURIComponent(address + ', Australia');
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            setCoordinates([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
            setError(null);
          } else {
            setError('Location not found');
          }
        })
        .catch(() => {
          setError('Failed to geocode address');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [latitude, longitude, address]);

  const openInGoogleMaps = () => {
    if (coordinates) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${coordinates[0]},${coordinates[1]}`, '_blank');
    } else if (address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    }
  };

  if (!address && !latitude && !longitude) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Location
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={openInGoogleMaps}
            className="gap-1 text-xs"
            data-testid="button-open-google-maps"
          >
            <ExternalLink className="w-3 h-3" />
            Open in Maps
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center bg-muted/50">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="h-[200px] flex items-center justify-center bg-muted/50">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : coordinates ? (
          <div className="h-[200px]" data-testid="map-container">
            <MapContainer
              center={coordinates}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={coordinates}>
                <Popup>
                  <strong>{clientName}</strong>
                  {address && <p className="text-xs mt-1">{address}</p>}
                </Popup>
              </Marker>
              <MapUpdater center={coordinates} />
            </MapContainer>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center bg-muted/50">
            <p className="text-sm text-muted-foreground">No location data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
