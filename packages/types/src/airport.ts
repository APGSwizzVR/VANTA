export type AirportType =
  | "large_airport"
  | "medium_airport"
  | "small_airport"
  | "heliport"
  | "seaplane_base"
  | "closed";

export interface Airport {
  icao: string;
  iata: string | null;
  name: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  elevationFeet: number | null;
  type: AirportType;
}

export type RunwaySurface =
  | "ASPHALT"
  | "CONCRETE"
  | "GRASS"
  | "GRAVEL"
  | "WATER"
  | "DIRT"
  | "OTHER";

export interface Runway {
  id: string;
  airportIcao: string;
  lengthFeet: number | null;
  widthFeet: number | null;
  surface: RunwaySurface;
  lowIdent: string | null;
  lowHeadingDegrees: number | null;
  highIdent: string | null;
  highHeadingDegrees: number | null;
}

export type FrequencyType =
  | "DEL"
  | "GND"
  | "TWR"
  | "APP"
  | "DEP"
  | "CTR"
  | "FSS"
  | "ATIS"
  | "UNICOM"
  | "AWOS"
  | "OTHER";

export interface AirportFrequency {
  id: string;
  airportIcao: string;
  type: FrequencyType;
  description: string;
  frequencyMhz: number;
}

export type NavaidType = "VOR" | "NDB" | "DME" | "TACAN" | "VORTAC" | "OTHER";

export interface Navaid {
  id: string;
  ident: string;
  name: string;
  type: NavaidType;
  frequency: number | null;
  latitude: number;
  longitude: number;
  associatedAirportIcao: string | null;
}
