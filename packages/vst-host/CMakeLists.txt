cmake_minimum_required(VERSION 3.15)
project(CleanCueVSTHost VERSION 0.3.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Fetch JUCE framework
include(FetchContent)
FetchContent_Declare(
    JUCE
    GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
    GIT_TAG        7.0.12
    GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(JUCE)

# Create executable
juce_add_console_app(CleanCueVSTHost
    PRODUCT_NAME "CleanCue VST Host")

target_sources(CleanCueVSTHost PRIVATE
    src/Main.cpp
    src/VSTHostService.cpp
    src/PluginScanner.cpp
    src/AudioEngine.cpp
    src/IPCCommunication.cpp
)

target_compile_definitions(CleanCueVSTHost PRIVATE
    JUCE_WEB_BROWSER=0
    JUCE_USE_CURL=0
    JUCE_VST3_CAN_REPLACE_VST2=0
    JUCE_PLUGINHOST_VST=1
    JUCE_PLUGINHOST_VST3=1
    JUCE_PLUGINHOST_AU=1
)

target_link_libraries(CleanCueVSTHost PRIVATE
    juce::juce_audio_basics
    juce::juce_audio_devices
    juce::juce_audio_formats
    juce::juce_audio_processors
    juce::juce_core
    juce::juce_data_structures
    juce::juce_events
)

# Platform-specific settings
if(APPLE)
    target_compile_definitions(CleanCueVSTHost PRIVATE
        JUCE_PLUGINHOST_AU=1
    )
endif()

# Install to resources directory for Electron app
install(TARGETS CleanCueVSTHost
    RUNTIME DESTINATION ${CMAKE_SOURCE_DIR}/../../apps/desktop/resources
)
