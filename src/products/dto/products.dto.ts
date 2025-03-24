//* Interfaces
interface PriceData {
    finalPrice: number;
    originalPrice: number;
    currencyCode: string;
}
  
interface PaxAvailabilityData {
    type: string;
    name?: string | null;
    description?: string | null;
    min?: number | null;
    max?: number | null;
    remaining: number;
    price: PriceData;
}

interface SlotData {
    startDate: string;
    startTime: string;
    endTime: string;
    currencyCode: string;
    providerSlotId: string;
    remaining: number;
    paxAvailability: PaxAvailabilityData[];
}
  
interface SlotResponseData {
    startDate: string;
    startTime: string;
    endTime?: string;
    currencyCode?: string;
    providerSlotId?: string;
    remaining: number;
    paxAvailability: PaxAvailabilityData[];
}

interface DateAvailability {
    date: string;
    price: PriceData;
};


//* Types
type Slots = {
    slots: Array<SlotResponseData>;
};

type DateInventory = {
	dates: Array<DateAvailability>;
};

export { 
    Slots,
    SlotData,
    
    DateInventory,
    DateAvailability,
};
