#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include <signal.h>

#include <string>
#include <fstream>
#include <iostream>
#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>

#include <pulse/pulseaudio.h>

#define BUFSIZE 1024

std::ofstream pcm_file;

// WAV file header structure
// struct wav_header {
//     char riff[4];            // "RIFF" chunk descriptor
//     unsigned int file_size;  // File size excluding header
//     char wave[4];            // "WAVE" chunk descriptor
//     char fmt[4];             // "fmt " sub-chunk descriptor
//     unsigned int fmt_size;   // Size of the fmt chunk
//     unsigned short format;   // Format (PCM = 1)
//     unsigned short channels; // Number of channels (mono = 1, stereo = 2)
//     unsigned int sample_rate;// Sample rate (e.g., 44100)
//     unsigned int byte_rate;  // Byte rate (sample_rate * channels * bits_per_sample / 8)
//     unsigned short block_align; // Block align (channels * bits_per_sample / 8)
//     unsigned short bits_per_sample; // Bits per sample (e.g., 16)
//     char data[4];            // "data" sub-chunk descriptor
//     unsigned int data_size;  // Size of the data chunk
// };

// // Write WAV header
// // TODO these values should be declared in seperate struct, loser!
// struct wav_header HEADER = {
//     .riff = {'R', 'I', 'F', 'F'},
//     .wave = {'W', 'A', 'V', 'E'},
//     .fmt = {'f', 'm', 't', ' '},
//     .fmt_size = 16, // Size of the fmt sub-chunk
//     .format = 1,    // PCM format
//     .channels = 2,
//     .sample_rate = 48000U,
//     .bits_per_sample = 16U, // Fixed 16 bits per sample for this example
//     .byte_rate = 48000U * 2U * 16U / 8U,
//     .block_align = 2 * 16 / 8,
//     .data = {'d', 'a', 't', 'a'},
//     .data_size = 0 // Placeholder for now, will be updated later
// };

void stream_state_cb(pa_stream *stream, void *userdata) {
  const pa_stream_state state = pa_stream_get_state(stream);
    switch (state) {
    case PA_STREAM_FAILED:
      std::cout << "Stream failed\n";
      break;
    case PA_STREAM_READY:
      std::cout << "Stream ready\n";

      break;
    default:
      std::cout << "Stream state: " << state << std::endl;
    }
}

void pa_stream_read_cb(pa_stream *stream, const size_t /*nbytes*/, void* /*userdata*/)
{
    // Careful when to pa_stream_peek() and pa_stream_drop()!
    // c.f. https://www.freedesktop.org/software/pulseaudio/doxygen/stream_8h.html#ac2838c449cde56e169224d7fe3d00824
    int16_t *data = nullptr;
    size_t actualbytes = 0;
    if (pa_stream_peek(stream, (const void**)&data, &actualbytes) != 0) {
        std::cerr << "Failed to peek at stream data\n";
        return;
    }

    if (data == nullptr && actualbytes == 0) {
      // No data in the buffer, ignore.
      return;
    } else if (data == nullptr && actualbytes > 0) {
        // Hole in the buffer. We must drop it.
        if (pa_stream_drop(stream) != 0) {
            std::cerr << "Failed to drop a hole! (Sounds weird, doesn't it?)\n";
            return;
        }
    }

    // process data
    pcm_file.write((const char*)data, actualbytes);
    pcm_file.flush();

    if (pa_stream_drop(stream) != 0) {
      std::cerr << "Failed to drop data after peeking.\n";
    }
}

void server_info_cb(pa_context *ctx, const pa_server_info *info, void *userdata) {
    std::cout << "Default sink: " << info->default_sink_name << std::endl;

    pa_sample_spec spec;
    spec.format = PA_SAMPLE_S16LE;
    spec.rate = 48000;
    spec.channels = 2;
    // Use pa_stream_new_with_proplist instead?
    pa_stream *stream = pa_stream_new(ctx, "output monitor", &spec, nullptr);

    pa_stream_set_state_callback(stream, &stream_state_cb, nullptr /*userdata*/);
    pa_stream_set_read_callback(stream, &pa_stream_read_cb, nullptr /*userdata*/);

    std::string monitor_name(info->default_sink_name);
    monitor_name += ".monitor";
    if (pa_stream_connect_record(stream, monitor_name.c_str(), nullptr, PA_STREAM_NOFLAGS) != 0) {
      std::cerr << "connection fail\n";
      return;
    }

    std::cout << "Connected to " << monitor_name << std::endl;
}

void context_state_callback(pa_context *ctx, void *userdata) {
    const pa_context_state state = pa_context_get_state(ctx);
    switch (state) {
    case PA_CONTEXT_READY:
      std::cout << "Context ready\n";
      pa_context_get_server_info(ctx, &server_info_cb, nullptr /*userdata*/);
      break;
    case PA_CONTEXT_FAILED:
      std::cout << "Context failed\n";
      break;
    default:
      std::cout << "Context state: " << state << std::endl;
    }
}

int
main (int    argc,
      char **argv)
{
    pcm_file.open("captured_audio.pcm", std::ios::binary);

    pa_mainloop *loop = pa_mainloop_new();
    pa_mainloop_api *loop_api = pa_mainloop_get_api(loop);
    pa_context *ctx = pa_context_new(loop_api, "tongues");
    pa_context_set_state_callback(ctx, &context_state_callback, nullptr);
    if (pa_context_connect(ctx, nullptr, PA_CONTEXT_NOFLAGS, nullptr) < 0) {
      std::cerr << "PA connection failed.\n";
      return 1;
    }

    pa_mainloop_run(loop, nullptr);

    return 0;
}
