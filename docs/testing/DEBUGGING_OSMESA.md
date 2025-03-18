# Debugging OSMesa Rendering Issues

This guide provides troubleshooting steps for common OSMesa rendering issues in the Hashi ChimeraX integration.

## Prerequisites

Before following this guide, verify that you have:

1. ChimeraX installed and available in your PATH
2. OSMesa libraries installed
3. Proper configuration for offscreen rendering

## Verifying Dependencies

### Automated Test Script

For a complete test of the OSMesa integration, use our test script:

```bash
# From the project root
./run-osmesa-tests.sh
```

This script will:
1. Check for ChimeraX installation
2. Detect OSMesa libraries on your system
3. Run the dependency verification script
4. Start the standalone test server
5. Test all API endpoints, including snapshot generation

### Manual Verification

You can also run the dependency verification script to check your environment:

```bash
# From the project root
./scripts/verify-dependencies.sh
```

This script will detect:
- Whether ChimeraX is properly installed
- Whether OSMesa libraries are available
- Whether ChimeraX is linked with OSMesa
- Platform-specific details

## Common Error Messages

### "Unable to save images because OpenGL rendering is not available"

This error indicates that ChimeraX is trying to render an image without properly configured OpenGL support. Common causes:

1. **Missing OSMesa**: The OSMesa libraries are not installed.
2. **Linking Issues**: ChimeraX is not properly linked with OSMesa.
3. **Docker Configuration**: X11 forwarding or virtual framebuffer is missing.

**Testing Note**: We've verified this error occurs on macOS systems as expected. The ChimeraX REST API correctly returns an error response for the snapshot endpoint:
```bash
curl -X POST -H "Content-Type: application/json" -d '{"width":800,"height":600}' http://localhost:9876/api/chimerax/snapshot
{"status":"error","message":"Failed to create snapshot"}
```

The ChimeraX log shows the expected error message:
```
ERROR: Unable to save images because OpenGL rendering is not available
```

This triggers the frontend fallback mechanism to use client-side rendering.

### "OpenGL vendor string was unrecognized or could not be retrieved"

This error suggests that ChimeraX cannot access any OpenGL implementation:

1. **Missing Graphics Drivers**: Even headless rendering needs some drivers.
2. **Incorrect Library Configuration**: LD_LIBRARY_PATH might not include OSMesa.
3. **Conflict with System GL**: Another OpenGL implementation is taking precedence.

### "Segmentation fault" during rendering

Crashes during rendering operations can have various causes:

1. **Version Mismatch**: Incompatible versions of ChimeraX and OSMesa.
2. **Memory Issues**: Not enough memory for the requested rendering.
3. **Permission Problems**: Issues with writing files or accessing directories.

## Platform-Specific Troubleshooting

### Linux

1. Check installed OSMesa packages:
   ```bash
   dpkg -l | grep -i osmesa  # Debian/Ubuntu
   rpm -qa | grep -i osmesa  # RHEL/CentOS
   ```

2. Verify library linking:
   ```bash
   ldd $(which chimerax) | grep -i osmesa
   ```

3. Set environment variables:
   ```bash
   export PYTHONPATH=/path/to/chimerax/lib/python3.x/site-packages
   export LD_LIBRARY_PATH=/path/to/osmesa/lib:$LD_LIBRARY_PATH
   ```

### macOS

1. Check Homebrew installation:
   ```bash
   brew list | grep mesa
   brew info mesa
   find /opt/homebrew -name "*OSMesa*"
   ```

2. Verify library linking:
   ```bash
   otool -L /Applications/ChimeraX.app/Contents/MacOS/ChimeraX | grep -i osmesa
   ```

3. Set environment variables:
   ```bash
   export DYLD_LIBRARY_PATH=/usr/local/lib:/opt/homebrew/lib:$DYLD_LIBRARY_PATH
   ```

**Solution for OSMesa on macOS:** With OSMesa installed via Homebrew, ChimeraX can use the libraries if properly configured. We've confirmed that:

1. OSMesa libraries are present at `/opt/homebrew/lib/libOSMesa.dylib`
2. ChimeraX doesn't look in Homebrew locations by default, as shown in its error logs:
   ```
   dlopen(OSMesa, 0x000A): tried: 'OSMesa' (no such file), 
   '/System/Volumes/Preboot/Cryptexes/OSOSMesa' (no such file), 
   '/Applications/ChimeraX.app/Contents/lib/OSMesa' (no such file), 
   '/Applications/ChimeraX.app/Contents/Library/Frameworks/Python.framework/OSMesa' (no such file), 
   '/usr/lib/OSMesa' (no such file, not in dyld cache)
   ```

3. **Working Solution**: Set environment variables when spawning the ChimeraX process
   ```javascript
   chimeraxProcess = spawn(CHIMERAX_PATH, ['--nogui', '--offscreen'], {
     stdio: ['pipe', 'pipe', 'pipe'],
     env: {
       ...process.env,
       OSMESA_LIBRARY: '/opt/homebrew/lib/libOSMesa.dylib',
       DYLD_LIBRARY_PATH: '/opt/homebrew/lib:' + (process.env.DYLD_LIBRARY_PATH || '')
     }
   });
   ```

We've updated the standalone test server with this solution, and it now successfully creates snapshots on macOS.

You can also use our provided scripts to test:
- `run-osmesa-tests.sh` - Detects OSMesa and tests API endpoints
- `run-with-osmesa.sh` - Sets environment variables for ChimeraX

For macOS development, you can now use either the direct OSMesa rendering or the fallback mechanisms, giving you flexibility for testing different scenarios.

### Docker Containers

1. Check container configuration:
   ```bash
   docker inspect <container_id>
   ```

2. Verify OSMesa in the container:
   ```bash
   docker exec <container_id> ldconfig -p | grep -i osmesa
   ```

3. Mount volumes properly:
   ```
   volumes:
     - ./snapshots:/app/snapshots
   ```

## Logging and Debugging

### Enabling Verbose Logging

1. Set environment variables for more detailed output:
   ```bash
   export CHIMERAX_DEBUG=1
   export OSMESA_DEBUG=1
   ```

2. Run ChimeraX in debug mode:
   ```bash
   chimerax --debug
   ```

### Debugging Snapshots

1. Start with a minimal test command:
   ```
   open 1ubq; wait 2; save /path/to/test.png width 200 height 200
   ```

2. Test with the standalone server:
   ```bash
   # Start the server
   node standalone-test.js
   
   # Test the API endpoints sequentially:
   curl http://localhost:9876/api/health
   curl -X POST http://localhost:9876/api/chimerax/start
   curl -X POST -H "Content-Type: application/json" -d '{"command":"open 1ubq"}' http://localhost:9876/api/chimerax/command
   curl -X POST -H "Content-Type: application/json" -d '{"width":800,"height":600}' http://localhost:9876/api/chimerax/snapshot
   ```

3. Incrementally add more complexity to isolate issues.

### Using Test Utilities

1. Run the OSMesa test suite:
   ```bash
   npm test -- -t "OSMesa"
   ```

2. Use the mock utilities to simulate different environments:
   ```javascript
   import ChimeraXMockUtil, { ChimeraXEnvironment } from './mocks/chimeraxMock';
   
   // Test with OSMesa available
   ChimeraXMockUtil.setEnvironment(ChimeraXEnvironment.FULL_RENDERING);
   
   // Test without OSMesa
   ChimeraXMockUtil.setEnvironment(ChimeraXEnvironment.NO_OSMESA);
   ```

## Fallback Mechanisms

When direct rendering fails, the application uses fallback mechanisms:

1. **External PDB Resources**: The application falls back to pre-rendered images from services like RCSB PDB.

2. **Client-Side Rendering**: For interactive visualization, the application can use client-side rendering with Three.js.

To verify fallbacks are working:

1. Intentionally disable OSMesa:
   ```bash
   export OSMESA_DISABLED=1
   ```

2. Monitor the application logs for fallback indicators:
   ```
   [INFO] ChimeraX rendering unavailable, using fallback visualization
   ```

3. Check the UI for fallback notification messages.

## Reporting Issues

When reporting OSMesa-related issues, include:

1. Output from `verify-dependencies.sh`
2. Error messages from ChimeraX logs
3. Information about your environment (OS, container, etc.)
4. Steps to reproduce the issue
5. Any modifications made to configuration

## Additional Resources

- [OSMesa Documentation](https://www.mesa3d.org/osmesa.html)
- [ChimeraX Command Documentation](https://www.rbvi.ucsf.edu/chimerax/docs/user/commands/index.html)
- [Docker Documentation for X11 Forwarding](https://docs.docker.com/config/containers/container-networking/)