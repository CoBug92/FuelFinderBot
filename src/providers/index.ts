import type { Brand } from "../domain/types.js";
import { GazpromneftProvider } from "./gazpromneft.js";
import { LukoilProvider } from "./lukoil.js";
import type { StationProvider } from "./types.js";

type ProviderFactory = () => StationProvider;

const PROVIDER_FACTORIES: Partial<Record<Brand, ProviderFactory>> = {
  gazpromneft: () => new GazpromneftProvider(),
  lukoil: () => new LukoilProvider()
};

export function createProviders(enabledBrands: Brand[]): StationProvider[] {
  return enabledBrands.flatMap((brand) => {
    const factory = PROVIDER_FACTORIES[brand];

    if (!factory) {
      return [];
    }

    return [factory()];
  });
}

export function getImplementedBrands(): Brand[] {
  return Object.keys(PROVIDER_FACTORIES) as Brand[];
}
