export interface DomainFailure {
    type: "DOMAIN_ERROR";
    message: string;
}

export interface TransportFailure {
    type: "TRANSPORT_ERROR";
    message: string;   
}

export type OrderFailure = DomainFailure | TransportFailure;