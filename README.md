# LIFX LAN MCP

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) server for allowing an LLM to control LIFX lights over your local area network (LAN), without cloud connectivity.

**Note** that the MCP server must be running on the same wifi network as your LIFX lights in order for the tool to work.

## Features

- List all available LIFX lights on your network
- Get the current state of lights (color, on/off, labels)
- Turn lights on/off
- Change light colors
- Local network operation (no cloud required, server must be running on the same )

### Tools

- **lifx_lan_list_lights**
  - List all Lifx lights currently available on the user's local area network (LAN)
  - Each light is specified by a unique string label
  - Includes additional information about the light, such as group and location
  - Inputs: None required

- **lifx_lan_get_lights_state**
  - Get the current state of one or more LIFX lights, including colors, on/off state, groups and locations
  - Inputs:
    - `labels` (string[]): Array of light labels to get state for

- **lifx_lan_set_lights_color**
  - Set the color of one or more Lifx lights
  - Inputs:
    - `labels` (string[]): Array of light labels to set color for
    - `color` (object): Color specification
      - `hue` (number): Hue value (0.0-1.0)
      - `saturation` (number): Saturation value (0.0-1.0)
      - `brightness` (number): Brightness value (0.0-1.0) 
      - `kelvin` (number, optional): Color temperature in Kelvin (1500-9000, defaults to 3500)
    - `duration` (number, optional): Transition duration in milliseconds

- **lifx_lan_turn_on_lights**
  - Turn on one or more Lifx lights, optionally at specific color
  - Inputs:
    - `labels` (string[]): Array of light labels to turn on
    - `color` (object, optional): Color specification if changing color
      - `hue` (number, optional): Hue value (0.0-1.0)
      - `saturation` (number, optional): Saturation value (0.0-1.0)
      - `brightness` (number, optional): Brightness value (0.0-1.0)
      - `kelvin` (number, optional): Color temperature in Kelvin
    - `duration` (number, optional): Transition duration in milliseconds

- **lifx_lan_turn_off_lights**
  - Turn off one or more Lifx lights
  - Inputs:
    - `labels` (string[]): Array of light labels to turn off
    - `duration` (number, optional): Transition duration in milliseconds


## Installation



## Usage


## Development

### Prerequisites
- Node.js
- TypeScript
- LIFX lights on your local network

### Building from Source

1. Clone the repository:
```bash
git clone https://github.com/simon-duchastel/lifx-lan-mcp.git
cd lifx-lan-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

The MCP definition is found in [index.ts](index.ts), which contains all of the tools available to the LLM. The APIs which the tools call are availabe in the [src/](src/) folder.

### Development Scripts
- `npm run prepare` - Compile the project (builds `dist/index.js`)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Simon Duchastel

Feel free to reach out at [lifx-lan-mcp@duchastel.com](mailto:lifx-lan-mcp@duchastel.com).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For support, please [open an issue](https://github.com/simon-duchastel/lifx-lan-mcp/issues) on GitHub. 