declare module "react-leaflet" {
  import type { ComponentType, ReactNode } from "react";
  export const MapContainer: ComponentType<any>;
  export const TileLayer: ComponentType<any>;
  export const Marker: ComponentType<any>;
  export const Popup: ComponentType<any>;
  export const Polyline: ComponentType<any>;
  export const useMap: () => any;
}
