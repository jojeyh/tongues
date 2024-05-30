#include <pulse/pulseaudio.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include <string>

// TODO should probably remove these from global context
static pa_mainloop *mainloop = NULL;
static pa_context *context = NULL;
static pa_stream *stream = NULL;
static FILE *output_file = NULL;

void stream_state_callback(pa_stream *s, void *userdata) {
    pa_stream_state_t state = pa_stream_get_state(s);
    switch (state) {
        case PA_STREAM_CREATING:
            printf("Stream is creating\n");
            break;
        case PA_STREAM_READY:
            printf("Stream is ready\n");
            break;
        case PA_STREAM_TERMINATED:
            printf("Stream terminated\n");
            break;
        case PA_STREAM_FAILED:
            printf("Stream failed: %s\n", pa_strerror(pa_context_errno(context)));
            break;
        default:
            printf("Stream state: %d\n", state);
            break;
    }
}

void stream_read_callback(pa_stream *s, size_t length, void *userdata) {
    const void *data;
    if (pa_stream_peek(s, &data, &length) < 0) {
        fprintf(stderr, "pa_stream_peek() failed: %s\n", pa_strerror(pa_context_errno(context)));
        return;
    }
    fwrite(data, 1, length, output_file);
    pa_stream_drop(s);
}

void server_info_callback(pa_context *c, const pa_server_info *info, void *userdata) {
    printf("Default sink name: %s\n", info->default_sink_name);

    pa_sample_spec ss;
    ss.format = PA_SAMPLE_S16LE;
    ss.rate = 48000;
    ss.channels = 2;

    stream = pa_stream_new(c, "Record", &ss, NULL);
    if (!stream) {
        fprintf(stderr, "pa_stream_new() failed: %s\n", pa_strerror(pa_context_errno(c)));
        pa_mainloop_quit(mainloop, 1);
        return;
    }

    pa_stream_set_state_callback(stream, stream_state_callback, NULL);
    pa_stream_set_read_callback(stream, stream_read_callback, NULL);

    pa_buffer_attr buffer_attr;
    buffer_attr.maxlength = (uint32_t) -1;
    buffer_attr.tlength = (uint32_t) -1;
    buffer_attr.prebuf = (uint32_t) -1;
    buffer_attr.minreq = (uint32_t) -1;

    std::string monitor_name(info->default_sink_name);
    monitor_name += ".monitor";
    if (pa_stream_connect_record(stream, monitor_name.c_str(), &buffer_attr, PA_STREAM_NOFLAGS) < 0) {
        fprintf(stderr, "pa_stream_connect_record() failed: %s\n", pa_strerror(pa_context_errno(c)));
        pa_mainloop_quit(mainloop, 1);
    }
}

void context_state_callback(pa_context *c, void *userdata) {
    pa_context_state_t state = pa_context_get_state(c);
    switch (state) {
        case PA_CONTEXT_READY: {
            printf("Context is ready\n");

            pa_operation *o = pa_context_get_server_info(c, server_info_callback, NULL);
            if (o) {
                pa_operation_unref(o);
            }

            
            break;
        }
        case PA_CONTEXT_TERMINATED:
            printf("Context terminated\n");
            pa_mainloop_quit(mainloop, 0);
            break;
        case PA_CONTEXT_FAILED:
            printf("Context failed: %s\n", pa_strerror(pa_context_errno(c)));
            pa_mainloop_quit(mainloop, 1);
            break;
        default:
            printf("Context state: %d\n", state);
            break;
    }
}

int main(int argc, char *argv[]) {
    mainloop = pa_mainloop_new();
    context = pa_context_new(pa_mainloop_get_api(mainloop), "Tongues");

    pa_context_set_state_callback(context, context_state_callback, NULL);
    if (pa_context_connect(context, NULL, PA_CONTEXT_NOFLAGS, NULL) < 0) {
        fprintf(stderr, "pa_context_connect() failed: %s\n", pa_strerror(pa_context_errno(context)));
        return 1;
    }

    output_file = fopen("output.pcm", "wb");
    if (!output_file) {
        fprintf(stderr, "Failed to open output file\n");
        return 1;
    }

    int ret = 0;
    pa_mainloop_run(mainloop, &ret);

    pa_context_unref(context);
    pa_mainloop_free(mainloop);

    return ret;
}
