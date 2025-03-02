# Integration System Architecture

## Overview

The Integration System is composed of several components that work together to provide a standardized way to add external services to the MCP server. This document describes how these components relate to each other and the overall architecture.

## Component Relationships

```
┌─────────────────────┐
│   IntegrationManager  │
│                     │
│  - resourceProvider ◄────┐
│  - toolRegistry     ◄───┐│
└──────────┬──────────┘   ││
           │              ││
           │ manages      ││
           ▼              ││
┌─────────────────────┐   ││
│ IntegrationRegistry │   ││
│                     │   ││
│  - Map<name, def>   │   ││
└─────────┬───────────┘   ││
          │ contains      ││
          ▼               ││
┌─────────────────────┐   ││
│ IntegrationDefinition│   ││
│                     │   ││
│  - integration      │   ││
│  - configSchema     │   ││
│  - getStatus        │   ││
└─────────┬───────────┘   ││
          │ provides      ││
          │               ││
┌─────────▼───────────┐   ││
│ ResourceTemplates   │───┘│
│                     │    │
│  - parameters       │    │
│  - generator        │    │
└─────────────────────┘    │
                           │
┌─────────────────────┐    │
│   Tools             │────┘
│                     │
│  - input/output     │
│  - handler          │
└─────────────────────┘
```

## Initialization Sequence

1. The MCP server starts in `main.ts`
2. The `IntegrationManager.Live` layer is provided to the HttpLive layer
3. During initialization of `IntegrationManager.Live`:
   - The `IntegrationRegistry.Live` layer is initialized as a dependency
   - The ResourceProvider and ToolRegistry are acquired
   - Standard integration resource templates are registered
   - Built-in integrations (like GitHub) are registered
4. Once initialized, integrations are available for use by:
   - ResourceProvider (via URI templates)
   - ToolRegistry (via registered tools)

## Data Flow

### Registration Flow

```
┌───────────┐    ┌───────────────┐    ┌────────────────┐
│   Client  │───►│ IntegrationMgr│───►│IntegrationReg  │
└───────────┘    └─────┬─────────┘    └────────────────┘
                       │
                       │
          ┌────────────▼────────────┐
          │                         │
┌─────────▼──────┐      ┌──────────▼───────┐
│ResourceProvider│      │  ToolRegistry    │
└────────────────┘      └──────────────────┘
```

### Resource Access Flow

```
┌───────────┐    ┌───────────────┐    ┌────────────────┐    ┌────────────────┐
│   Client  │───►│ResourceProvider│───►│TemplateResolver│───►│IntegrationReg  │
└───────────┘    └───────────────┘    └────────────────┘    └────────┬───────┘
                                                                      │
                                                                      │
                                                            ┌─────────▼───────┐
                                                            │ Integration     │
                                                            │ Generator       │
                                                            └─────────────────┘
```

### Tool Execution Flow

```
┌───────────┐    ┌───────────────┐    ┌────────────────┐
│   Client  │───►│ ToolRegistry  │───►│ Tool Handler   │
└───────────┘    └───────────────┘    └────────────────┘
```

## Configuration

Each integration has its own configuration schema, which is used to validate the configuration passed to the integration. This allows integrations to have different configuration requirements.

The IntegrationManager can pass default configuration to integrations when checking their status. This allows the system to provide sensible defaults for integrations that require configuration.

## Error Handling

The Integration System uses Effect's error channel to propagate errors:

- `IntegrationError` - Base error type for integration-related errors
- `IntegrationNotFoundError` - When an integration is not found in the registry
- `IntegrationValidationError` - When configuration validation fails
- `IntegrationAlreadyExistsError` - When trying to register an integration with a name that already exists

All operations return `Effect` values that can fail with these error types.