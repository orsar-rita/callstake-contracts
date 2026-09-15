# CallStake Deep Links

This document describes the `callstake://` deep link scheme used by CallStake-compatible mobile and wallet integrations.

## `callstake://copy`

The `copy` action creates a trade copy request from a signal and pre-fills amount and slippage values.

### Format

```text
callstake://copy?signal_id=<signal-id>&amount=<amount>&slippage=<slippage>
```

### Parameters

- `signal_id` (required): The unique identifier of the signal to copy. This is an opaque string from CallStake.
- `amount` (required): The requested trade amount as a decimal string. The value is interpreted in the app's base asset units.
- `slippage` (required): Maximum allowed slippage tolerance expressed as a decimal percentage.
  - Example: `0.5` represents `0.5%` slippage tolerance.

### Example

```text
callstake://copy?signal_id=signal-12345&amount=1500&slippage=0.5
```

### Notes

- All query values must be URL-encoded.
- `signal_id` is treated as a string and should be delivered exactly as issued by CallStake.
- `amount` is passed through as a decimal string to prevent precision loss.
- `slippage` is expressed as a decimal percentage rather than basis points.

### Integration guidance

- Mobile apps should parse the URI and route to the copy trade flow.
- Wallets can use the parameters to pre-populate or validate agreement fields.
- If the app cannot complete the request, it should surface a friendly error and preserve the incoming deep link.
