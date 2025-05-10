# Components

This directory contains reusable components for the FetanApp application.

## AddressAutocomplete

A reusable component that provides Google Places address autocomplete functionality.

### Usage

```tsx
import React, { useRef } from 'react';
import { View } from 'react-native';
import AddressAutocomplete, { AddressData, AddressAutocompleteRef } from './AddressAutocomplete';

const MyComponent = () => {
  const addressRef = useRef<AddressAutocompleteRef>(null);
  
  const handleAddressSelect = (place: AddressData) => {
    console.log('Selected address:', place.address);
    console.log('Location:', place.location);
    // Do something with the selected address
  };
  
  return (
    <View>
      <AddressAutocomplete
        ref={addressRef}
        placeholder="Enter an address"
        defaultValue=""
        onSelectAddress={handleAddressSelect}
        country="us"
        filterByCountry={true}
      />
    </View>
  );
};
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| placeholder | string | Text to display when the input is empty |
| defaultValue | string | Initial value for the input |
| onSelectAddress | (data: AddressData) => void | Callback function that is called when an address is selected |
| containerStyle | ViewStyle | Custom styles for the container |
| inputContainerStyle | ViewStyle | Custom styles for the input container |
| listViewStyle | ViewStyle | Custom styles for the suggestions list |
| country | string | Country code to filter results (default: "us") |
| filterByCountry | boolean | Whether to filter results by country (default: true) |

### Methods

The component exposes these methods through a ref:

| Method | Description |
|--------|-------------|
| clear() | Clears the input |
| getAddressText() | Returns the current input text |
| setAddressText(address: string) | Sets the input text |
| focus() | Focuses the input |
| blur() | Removes focus from the input | 