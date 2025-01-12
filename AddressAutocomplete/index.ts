import { IInputs, IOutputs } from "./generated/ManifestTypes";

interface IStateValue {
    state: string;
    value: number;
}
export class AddressAutocomplete implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private notifyOutputChanged: () => void;
    private searchBox: HTMLInputElement;
    private _context: ComponentFramework.Context<IInputs>;

    private autocomplete: google.maps.places.Autocomplete;
    private value: string;
    private street: string;
    private city: string;
    private county: string;
    private state: string;
    private zipcode: string;
    private country: string;
    private stateTransform: IStateValue[];

    constructor() {

    }

    public init(context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement) {

        this._context = context;
        debugger;

        let googleApiKey = context.parameters.googleapikey.raw;
        if (!googleApiKey || googleApiKey === 'val') {
            googleApiKey = prompt("Please provide a valid google api key");
        }


        this.notifyOutputChanged = notifyOutputChanged;

        this.searchBox = document.createElement("input");
        //this.searchBox.setAttribute("id", "searchBox");
        this.searchBox.className = "addressAutocomplete";
        this.searchBox.addEventListener("mouseenter", this.onMouseEnter.bind(this));
        this.searchBox.addEventListener("mouseleave", this.onMouseLeave.bind(this));

        container.appendChild(this.searchBox);

        //let googleApiKey = context.parameters.googleapikey.raw;
        let scriptUrl = `https://maps.googleapis.com/maps/api/js?libraries=places&language=en&key=${googleApiKey}`;

        let scriptNode = document.createElement("script");
        scriptNode.setAttribute("type", "text/javascript");
        scriptNode.setAttribute("src", scriptUrl);
        document.head.appendChild(scriptNode);

        window.setTimeout(() => {
            this.autocomplete = new google.maps.places.Autocomplete(
                this.searchBox, { types: ['geocode'] });

            // When the user selects an address from the drop-down, populate the
            // address fields in the form.
            this.autocomplete.addListener('place_changed', () => {
                debugger;
                let place = this.autocomplete.getPlace();
                if (place == null || place.address_components == null) {
                    return;
                }
                this.value = place.formatted_address || "";
                this.street = (this.getLongName(place.address_components, ["street_number"]) + " " + this.getLongName(place.address_components, ["route"])).trim();
                this.city = this.getLongName(place.address_components, ["locality","sublocality", "neighborhood", "administrative_area_level_3"]);  //https://developers.google.com/maps/documentation/geocoding/intro#Types
                this.county = this.getLongName(place.address_components, ["administrative_area_level_2"]);
                this.state = this.getShortName(place.address_components, ["administrative_area_level_1"]);
                this.country = this.getShortName(place.address_components, ["country"]);
                this.zipcode = this.getLongName(place.address_components, ["postal_code"]);
                /*
                let streetNumber = "";
                for (var i = 0; i < place.address_components.length; i++) {
                    let addressComponent: google.maps.GeocoderAddressComponent  = place.address_components[i];
                    let componentType: string = addressComponent.types[0];
                    let addressPiece = addressComponent.long_name;

                    switch (componentType) {
                        case "street_number":
                            streetNumber = ", " + addressPiece;
                            break;
                        case "route":
                            this.street = addressPiece + streetNumber;
                            break;
                        case "neighborhood":
                        case "locality":
                        case "postal_town":
                            this.city = addressPiece;
                            break;
                        case "administrative_area_level_2":
                            this.county = addressPiece;
                            break;
                        case "administrative_area_level_1":
                            this.state = addressPiece;
                            break;
                        case "country":
                            this.country = addressPiece;
                            break;
                        case "postal_code":
                            this.zipcode = addressPiece;
                            break;
                    }

                }
                */
                this.notifyOutputChanged();
            });
        },
            1000);
    }

    private onMouseEnter(): void {
        this.searchBox.className = "addressAutocompleteFocused";
    }

    private onMouseLeave(): void {
        this.searchBox.className = "addressAutocomplete";
    }


	/**
	 * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
	 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
	 */
    public updateView(context: ComponentFramework.Context<IInputs>): void {
        // Add code to update control view
    }

	/** 
	 * It is called by the framework prior to a control receiving new data. 
	 * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as “bound” or “output”
	 */
    public getOutputs(): IOutputs {
       
        let ret: IOutputs = {
            value: this.value,
            street: this.street,
            city: this.city,
            county: this.county,
            state: this.state,
            state_number: this.transformState(this.state),
            country: this.country,
            zipcode: this.zipcode
        }

        return ret;
    }

	/** 
	 * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
	 * i.e. cancelling any pending remote calls, removing listeners, etc.
	 */
    public destroy(): void {
        // Add code to cleanup control if necessary
    }
    private getLongName(addressComponents: google.maps.GeocoderAddressComponent[], types: string[]): string {

        var address: google.maps.GeocoderAddressComponent | undefined;
        for (var i = 0; i < types.length; i++) {
            address = addressComponents.find((x) => x.types.includes(types[i]));
            if (address) { break; }
        }
        if (address === undefined)
            return "";
        else
            return (<google.maps.GeocoderAddressComponent>address).long_name;
    }
    private getShortName(addressComponents: google.maps.GeocoderAddressComponent[], types: string[]): string {
        let address = addressComponents.find((x) => x.types.some(t => types.includes(t)));
        return address &&  address.short_name || "";
    }
    private transformState(state: string): number | undefined {
         // [{'state': 'CT','value': 100000008},{'state': 'ME','value': 100000000},{'state': 'NH','value': 100000002},{'state': 'NY','value': 100000005},{'state': 'PA','value': 100000006},{'state': 'PA','value': 100000006},{'state': 'VT','value': 100000003},{'state': 'RI','value': 100000007}]
        var rawStates: string;
        if (!this._context.parameters.stateTransform.raw || this._context.parameters.stateTransform.raw === 'val')
            rawStates = "[{'state': 'CT','value': 100000008},{'state': 'ME','value': 100000000},{'state': 'NH','value': 100000002},{'state': 'NY','value': 100000005},{'state': 'PA','value': 100000006},{'state': 'PA','value': 100000006},{'state': 'VT','value': 100000003},{'state': 'RI','value': 100000007}]";
        else 
            rawStates = this._context.parameters.stateTransform.raw || "";
        
        var states = <IStateValue[]>JSON.parse(rawStates.replace(/'/g, '"'));

        var ret = states.find((s: any) => s.state.toUpperCase() === state.toUpperCase());
        return ret && ret.value || undefined;
    };
}