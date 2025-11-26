import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

interface SuburbData {
  suburb: string;
  postcode: string;
  state: string;
}

const QLD_SUBURBS: SuburbData[] = [
  { suburb: "Caboolture", postcode: "4510", state: "QLD" },
  { suburb: "Caboolture South", postcode: "4510", state: "QLD" },
  { suburb: "Morayfield", postcode: "4506", state: "QLD" },
  { suburb: "Burpengary", postcode: "4505", state: "QLD" },
  { suburb: "Burpengary East", postcode: "4505", state: "QLD" },
  { suburb: "Narangba", postcode: "4504", state: "QLD" },
  { suburb: "Deception Bay", postcode: "4508", state: "QLD" },
  { suburb: "North Lakes", postcode: "4509", state: "QLD" },
  { suburb: "Mango Hill", postcode: "4509", state: "QLD" },
  { suburb: "Redcliffe", postcode: "4020", state: "QLD" },
  { suburb: "Scarborough", postcode: "4020", state: "QLD" },
  { suburb: "Margate", postcode: "4019", state: "QLD" },
  { suburb: "Clontarf", postcode: "4019", state: "QLD" },
  { suburb: "Woody Point", postcode: "4019", state: "QLD" },
  { suburb: "Kippa-Ring", postcode: "4021", state: "QLD" },
  { suburb: "Rothwell", postcode: "4022", state: "QLD" },
  { suburb: "Bribie Island", postcode: "4507", state: "QLD" },
  { suburb: "Bongaree", postcode: "4507", state: "QLD" },
  { suburb: "Woorim", postcode: "4507", state: "QLD" },
  { suburb: "Bellmere", postcode: "4510", state: "QLD" },
  { suburb: "Beachmere", postcode: "4510", state: "QLD" },
  { suburb: "Wamuran", postcode: "4512", state: "QLD" },
  { suburb: "Elimbah", postcode: "4516", state: "QLD" },
  { suburb: "Beerburrum", postcode: "4517", state: "QLD" },
  { suburb: "Glass House Mountains", postcode: "4518", state: "QLD" },
  { suburb: "Caloundra", postcode: "4551", state: "QLD" },
  { suburb: "Kawana Waters", postcode: "4575", state: "QLD" },
  { suburb: "Maroochydore", postcode: "4558", state: "QLD" },
  { suburb: "Mooloolaba", postcode: "4557", state: "QLD" },
  { suburb: "Buderim", postcode: "4556", state: "QLD" },
  { suburb: "Nambour", postcode: "4560", state: "QLD" },
  { suburb: "Noosa Heads", postcode: "4567", state: "QLD" },
  { suburb: "Brisbane City", postcode: "4000", state: "QLD" },
  { suburb: "South Brisbane", postcode: "4101", state: "QLD" },
  { suburb: "West End", postcode: "4101", state: "QLD" },
  { suburb: "Fortitude Valley", postcode: "4006", state: "QLD" },
  { suburb: "New Farm", postcode: "4005", state: "QLD" },
  { suburb: "Newstead", postcode: "4006", state: "QLD" },
  { suburb: "Teneriffe", postcode: "4005", state: "QLD" },
  { suburb: "Woolloongabba", postcode: "4102", state: "QLD" },
  { suburb: "Kangaroo Point", postcode: "4169", state: "QLD" },
  { suburb: "East Brisbane", postcode: "4169", state: "QLD" },
  { suburb: "Coorparoo", postcode: "4151", state: "QLD" },
  { suburb: "Camp Hill", postcode: "4152", state: "QLD" },
  { suburb: "Carindale", postcode: "4152", state: "QLD" },
  { suburb: "Mount Gravatt", postcode: "4122", state: "QLD" },
  { suburb: "Holland Park", postcode: "4121", state: "QLD" },
  { suburb: "Greenslopes", postcode: "4120", state: "QLD" },
  { suburb: "Stones Corner", postcode: "4120", state: "QLD" },
  { suburb: "Annerley", postcode: "4103", state: "QLD" },
  { suburb: "Yeronga", postcode: "4104", state: "QLD" },
  { suburb: "Fairfield", postcode: "4103", state: "QLD" },
  { suburb: "Tarragindi", postcode: "4121", state: "QLD" },
  { suburb: "Moorooka", postcode: "4105", state: "QLD" },
  { suburb: "Rocklea", postcode: "4106", state: "QLD" },
  { suburb: "Salisbury", postcode: "4107", state: "QLD" },
  { suburb: "Sunnybank", postcode: "4109", state: "QLD" },
  { suburb: "Sunnybank Hills", postcode: "4109", state: "QLD" },
  { suburb: "Eight Mile Plains", postcode: "4113", state: "QLD" },
  { suburb: "Upper Mount Gravatt", postcode: "4122", state: "QLD" },
  { suburb: "Mansfield", postcode: "4122", state: "QLD" },
  { suburb: "Wishart", postcode: "4122", state: "QLD" },
  { suburb: "Rochedale", postcode: "4123", state: "QLD" },
  { suburb: "Springwood", postcode: "4127", state: "QLD" },
  { suburb: "Underwood", postcode: "4119", state: "QLD" },
  { suburb: "Slacks Creek", postcode: "4127", state: "QLD" },
  { suburb: "Logan Central", postcode: "4114", state: "QLD" },
  { suburb: "Woodridge", postcode: "4114", state: "QLD" },
  { suburb: "Kingston", postcode: "4114", state: "QLD" },
  { suburb: "Browns Plains", postcode: "4118", state: "QLD" },
  { suburb: "Marsden", postcode: "4132", state: "QLD" },
  { suburb: "Crestmead", postcode: "4132", state: "QLD" },
  { suburb: "Loganholme", postcode: "4129", state: "QLD" },
  { suburb: "Tanah Merah", postcode: "4128", state: "QLD" },
  { suburb: "Beenleigh", postcode: "4207", state: "QLD" },
  { suburb: "Eagleby", postcode: "4207", state: "QLD" },
  { suburb: "Mount Warren Park", postcode: "4207", state: "QLD" },
  { suburb: "Ormeau", postcode: "4208", state: "QLD" },
  { suburb: "Pimpama", postcode: "4209", state: "QLD" },
  { suburb: "Coomera", postcode: "4209", state: "QLD" },
  { suburb: "Upper Coomera", postcode: "4209", state: "QLD" },
  { suburb: "Helensvale", postcode: "4212", state: "QLD" },
  { suburb: "Oxenford", postcode: "4210", state: "QLD" },
  { suburb: "Pacific Pines", postcode: "4211", state: "QLD" },
  { suburb: "Nerang", postcode: "4211", state: "QLD" },
  { suburb: "Southport", postcode: "4215", state: "QLD" },
  { suburb: "Labrador", postcode: "4215", state: "QLD" },
  { suburb: "Surfers Paradise", postcode: "4217", state: "QLD" },
  { suburb: "Broadbeach", postcode: "4218", state: "QLD" },
  { suburb: "Mermaid Beach", postcode: "4218", state: "QLD" },
  { suburb: "Miami", postcode: "4220", state: "QLD" },
  { suburb: "Burleigh Heads", postcode: "4220", state: "QLD" },
  { suburb: "Palm Beach", postcode: "4221", state: "QLD" },
  { suburb: "Currumbin", postcode: "4223", state: "QLD" },
  { suburb: "Tugun", postcode: "4224", state: "QLD" },
  { suburb: "Coolangatta", postcode: "4225", state: "QLD" },
  { suburb: "Tweed Heads", postcode: "2485", state: "NSW" },
  { suburb: "Ashgrove", postcode: "4060", state: "QLD" },
  { suburb: "Bardon", postcode: "4065", state: "QLD" },
  { suburb: "Paddington", postcode: "4064", state: "QLD" },
  { suburb: "Milton", postcode: "4064", state: "QLD" },
  { suburb: "Auchenflower", postcode: "4066", state: "QLD" },
  { suburb: "Toowong", postcode: "4066", state: "QLD" },
  { suburb: "Indooroopilly", postcode: "4068", state: "QLD" },
  { suburb: "St Lucia", postcode: "4067", state: "QLD" },
  { suburb: "Taringa", postcode: "4068", state: "QLD" },
  { suburb: "Chapel Hill", postcode: "4069", state: "QLD" },
  { suburb: "Kenmore", postcode: "4069", state: "QLD" },
  { suburb: "Fig Tree Pocket", postcode: "4069", state: "QLD" },
  { suburb: "Jindalee", postcode: "4074", state: "QLD" },
  { suburb: "Mount Ommaney", postcode: "4074", state: "QLD" },
  { suburb: "Oxley", postcode: "4075", state: "QLD" },
  { suburb: "Darra", postcode: "4076", state: "QLD" },
  { suburb: "Inala", postcode: "4077", state: "QLD" },
  { suburb: "Durack", postcode: "4077", state: "QLD" },
  { suburb: "Forest Lake", postcode: "4078", state: "QLD" },
  { suburb: "Springfield", postcode: "4300", state: "QLD" },
  { suburb: "Springfield Lakes", postcode: "4300", state: "QLD" },
  { suburb: "Ipswich", postcode: "4305", state: "QLD" },
  { suburb: "Booval", postcode: "4304", state: "QLD" },
  { suburb: "Bundamba", postcode: "4304", state: "QLD" },
  { suburb: "Goodna", postcode: "4300", state: "QLD" },
  { suburb: "Redbank", postcode: "4301", state: "QLD" },
  { suburb: "Redbank Plains", postcode: "4301", state: "QLD" },
  { suburb: "Richlands", postcode: "4077", state: "QLD" },
  { suburb: "Ellen Grove", postcode: "4078", state: "QLD" },
  { suburb: "Pallara", postcode: "4110", state: "QLD" },
  { suburb: "Stretton", postcode: "4116", state: "QLD" },
  { suburb: "Calamvale", postcode: "4116", state: "QLD" },
  { suburb: "Parkinson", postcode: "4115", state: "QLD" },
  { suburb: "Algester", postcode: "4115", state: "QLD" },
  { suburb: "Acacia Ridge", postcode: "4110", state: "QLD" },
  { suburb: "Coopers Plains", postcode: "4108", state: "QLD" },
  { suburb: "Robertson", postcode: "4109", state: "QLD" },
  { suburb: "Runcorn", postcode: "4113", state: "QLD" },
  { suburb: "Kuraby", postcode: "4112", state: "QLD" },
  { suburb: "Macgregor", postcode: "4109", state: "QLD" },
  { suburb: "Chermside", postcode: "4032", state: "QLD" },
  { suburb: "Chermside West", postcode: "4032", state: "QLD" },
  { suburb: "Kedron", postcode: "4031", state: "QLD" },
  { suburb: "Gordon Park", postcode: "4031", state: "QLD" },
  { suburb: "Wooloowin", postcode: "4030", state: "QLD" },
  { suburb: "Clayfield", postcode: "4011", state: "QLD" },
  { suburb: "Albion", postcode: "4010", state: "QLD" },
  { suburb: "Ascot", postcode: "4007", state: "QLD" },
  { suburb: "Hamilton", postcode: "4007", state: "QLD" },
  { suburb: "Eagle Farm", postcode: "4009", state: "QLD" },
  { suburb: "Pinkenba", postcode: "4008", state: "QLD" },
  { suburb: "Nudgee", postcode: "4014", state: "QLD" },
  { suburb: "Banyo", postcode: "4014", state: "QLD" },
  { suburb: "Virginia", postcode: "4014", state: "QLD" },
  { suburb: "Northgate", postcode: "4013", state: "QLD" },
  { suburb: "Nundah", postcode: "4012", state: "QLD" },
  { suburb: "Wavell Heights", postcode: "4012", state: "QLD" },
  { suburb: "Geebung", postcode: "4034", state: "QLD" },
  { suburb: "Zillmere", postcode: "4034", state: "QLD" },
  { suburb: "Aspley", postcode: "4034", state: "QLD" },
  { suburb: "Carseldine", postcode: "4034", state: "QLD" },
  { suburb: "Bald Hills", postcode: "4036", state: "QLD" },
  { suburb: "Bracken Ridge", postcode: "4017", state: "QLD" },
  { suburb: "Brighton", postcode: "4017", state: "QLD" },
  { suburb: "Sandgate", postcode: "4017", state: "QLD" },
  { suburb: "Shorncliffe", postcode: "4017", state: "QLD" },
  { suburb: "Deagon", postcode: "4017", state: "QLD" },
  { suburb: "Boondall", postcode: "4034", state: "QLD" },
  { suburb: "Taigum", postcode: "4018", state: "QLD" },
  { suburb: "Fitzgibbon", postcode: "4018", state: "QLD" },
  { suburb: "Strathpine", postcode: "4500", state: "QLD" },
  { suburb: "Brendale", postcode: "4500", state: "QLD" },
  { suburb: "Lawnton", postcode: "4501", state: "QLD" },
  { suburb: "Petrie", postcode: "4502", state: "QLD" },
  { suburb: "Kallangur", postcode: "4503", state: "QLD" },
  { suburb: "Dakabin", postcode: "4503", state: "QLD" },
  { suburb: "Griffin", postcode: "4503", state: "QLD" },
  { suburb: "Warner", postcode: "4500", state: "QLD" },
  { suburb: "Cashmere", postcode: "4500", state: "QLD" },
  { suburb: "Joyner", postcode: "4500", state: "QLD" },
  { suburb: "Albany Creek", postcode: "4035", state: "QLD" },
  { suburb: "Bridgeman Downs", postcode: "4035", state: "QLD" },
  { suburb: "McDowall", postcode: "4053", state: "QLD" },
  { suburb: "Everton Park", postcode: "4053", state: "QLD" },
  { suburb: "Everton Hills", postcode: "4053", state: "QLD" },
  { suburb: "Stafford", postcode: "4053", state: "QLD" },
  { suburb: "Stafford Heights", postcode: "4053", state: "QLD" },
  { suburb: "Mitchelton", postcode: "4053", state: "QLD" },
  { suburb: "Gaythorne", postcode: "4051", state: "QLD" },
  { suburb: "Enoggera", postcode: "4051", state: "QLD" },
  { suburb: "Newmarket", postcode: "4051", state: "QLD" },
  { suburb: "Alderley", postcode: "4051", state: "QLD" },
  { suburb: "Wilston", postcode: "4051", state: "QLD" },
  { suburb: "Windsor", postcode: "4030", state: "QLD" },
  { suburb: "Lutwyche", postcode: "4030", state: "QLD" },
  { suburb: "Grange", postcode: "4051", state: "QLD" },
  { suburb: "Kelvin Grove", postcode: "4059", state: "QLD" },
  { suburb: "Red Hill", postcode: "4059", state: "QLD" },
  { suburb: "Herston", postcode: "4006", state: "QLD" },
  { suburb: "Bowen Hills", postcode: "4006", state: "QLD" },
  { suburb: "Spring Hill", postcode: "4000", state: "QLD" },
  { suburb: "Petrie Terrace", postcode: "4000", state: "QLD" },
  { suburb: "The Gap", postcode: "4061", state: "QLD" },
  { suburb: "Ferny Grove", postcode: "4055", state: "QLD" },
  { suburb: "Ferny Hills", postcode: "4055", state: "QLD" },
  { suburb: "Arana Hills", postcode: "4054", state: "QLD" },
  { suburb: "Keperra", postcode: "4054", state: "QLD" },
  { suburb: "Samford Valley", postcode: "4520", state: "QLD" },
  { suburb: "Dayboro", postcode: "4521", state: "QLD" },
  { suburb: "Upper Kedron", postcode: "4055", state: "QLD" },
];

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onSuburbSelect: (suburb: string, state: string, postcode: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SuburbAutocomplete({
  value,
  onChange,
  onBlur,
  onSuburbSelect,
  placeholder = "Start typing suburb...",
  className,
  disabled,
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearchTerm(value || "");
  }, [value]);

  const filteredSuburbs = searchTerm.length >= 2
    ? QLD_SUBURBS.filter((s) =>
        s.suburb.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 10)
    : [];

  const handleSelect = (suburb: SuburbData) => {
    setSearchTerm(suburb.suburb);
    onChange(suburb.suburb);
    onSuburbSelect(suburb.suburb, suburb.state, suburb.postcode);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    if (newValue.length >= 2 && filteredSuburbs.length > 0) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setOpen(false);
      onBlur?.();
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={searchTerm}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        onFocus={() => {
          if (searchTerm.length >= 2 && filteredSuburbs.length > 0) {
            setOpen(true);
          }
        }}
        data-testid="input-suburb"
      />
      {open && filteredSuburbs.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <div className="max-h-[200px] overflow-auto p-1">
            {filteredSuburbs.map((suburb) => (
              <div
                key={`${suburb.suburb}-${suburb.postcode}`}
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover-elevate rounded-sm"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(suburb);
                }}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{suburb.suburb}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {suburb.state} {suburb.postcode}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
