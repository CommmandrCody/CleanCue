#include <JuceHeader.h>
#include "VSTHostService.h"
#include <iostream>

/**
 * CleanCue VST Host Service
 *
 * Standalone C++ application that hosts VST/VST3/AU plugins
 * and communicates with the Electron app via stdin/stdout JSON messages.
 */

class VSTHostApplication : public juce::JUCEApplicationBase
{
public:
    VSTHostApplication() = default;

    const juce::String getApplicationName() override { return "CleanCue VST Host"; }
    const juce::String getApplicationVersion() override { return "0.3.0"; }

    void initialise(const juce::String& commandLine) override
    {
        juce::ignoreUnused(commandLine);

        // Create the VST host service
        vstHostService = std::make_unique<VSTHostService>();

        // Start the IPC communication loop
        vstHostService->start();
    }

    void shutdown() override
    {
        vstHostService.reset();
    }

    void systemRequestedQuit() override
    {
        quit();
    }

private:
    std::unique_ptr<VSTHostService> vstHostService;
};

// Create the application instance
START_JUCE_APPLICATION(VSTHostApplication)
