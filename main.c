#include <gtk/gtk.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <pulse/simple.h>
#include <pulse/error.h>

#define BUFSIZE 1024

// WAV file header structure
struct wav_header {
    char riff[4];            // "RIFF" chunk descriptor
    unsigned int file_size;  // File size excluding header
    char wave[4];            // "WAVE" chunk descriptor
    char fmt[4];             // "fmt " sub-chunk descriptor
    unsigned int fmt_size;   // Size of the fmt chunk
    unsigned short format;   // Format (PCM = 1)
    unsigned short channels; // Number of channels (mono = 1, stereo = 2)
    unsigned int sample_rate;// Sample rate (e.g., 44100)
    unsigned int byte_rate;  // Byte rate (sample_rate * channels * bits_per_sample / 8)
    unsigned short block_align; // Block align (channels * bits_per_sample / 8)
    unsigned short bits_per_sample; // Bits per sample (e.g., 16)
    char data[4];            // "data" sub-chunk descriptor
    unsigned int data_size;  // Size of the data chunk
};

static void
record_audio (GtkWidget *widget,
             gpointer   data)
{
  pa_simple *s = NULL;
  pa_sample_spec ss;
  ss.format = PA_SAMPLE_S16LE;
  ss.channels = 2;
  ss.rate = 48000;

  int error;
  // Create the PulseAudio recording stream
  if (!(s = pa_simple_new(NULL, "tongues", PA_STREAM_RECORD, "alsa_output.pci-0000_00_1f.3-platform-skl_hda_dsp_generic.HiFi__hw_sofhdadsp__sink.monitor", "record", &ss, NULL, NULL, &error))) {
      fprintf(stderr, "pa_simple_new() failed: %s\n", pa_strerror(error));
      return;
  }

  // Open a WAV file for writing captured audio
  FILE *file = fopen("captured_audio.wav", "wb");
  if (!file) {
      fprintf(stderr, "Failed to open file for writing\n");
      goto finish;
  }

  // Write WAV header
  struct wav_header header = {
      .riff = {'R', 'I', 'F', 'F'},
      .wave = {'W', 'A', 'V', 'E'},
      .fmt = {'f', 'm', 't', ' '},
      .fmt_size = 16, // Size of the fmt sub-chunk
      .format = 1,    // PCM format
      .channels = ss.channels,
      .sample_rate = ss.rate,
      .bits_per_sample = 16, // Fixed 16 bits per sample for this example
      .byte_rate = ss.rate * ss.channels * 16 / 8,
      .block_align = ss.channels * 16 / 8,
      .data = {'d', 'a', 't', 'a'},
      .data_size = 0 // Placeholder for now, will be updated later
  };

  // Write the WAV header to the file
  fwrite(&header, sizeof(header), 1, file);

  // Buffer to store captured audio
  uint8_t buf[BUFSIZE];

  // Capture audio and write to the WAV file
  int counter = 0;

  while (counter < 1000) {
    if (pa_simple_read(s, buf, sizeof(buf), &error) < 0) {
      fprintf(stderr, "pa_simple_read() failed: %s\n", pa_strerror(error));
      goto finish;
    }

    // Write audio data to the WAV file
    fwrite(buf, 1, sizeof(buf), file);
	  counter++;
  }

finish:
  if (file) {
      // Update the data chunk size in the WAV header
      fseek(file, sizeof(header) - sizeof(header.data_size), SEEK_SET);
      header.data_size = ftell(file) - sizeof(header);
      fwrite(&header.data_size, sizeof(header.data_size), 1, file);
      fclose(file);
  }
  if (s)
      pa_simple_free(s);

  return;
}

static void
activate (GtkApplication *app,
          gpointer        user_data)
{
  GtkWidget *window;
  GtkWidget *button;

  window = gtk_application_window_new (app);
  gtk_window_set_title (GTK_WINDOW (window), "Hello");
  gtk_window_set_default_size (GTK_WINDOW (window), 400, 400);

  button = gtk_button_new_with_label ("Hello World");
  g_signal_connect (button, "clicked", G_CALLBACK (record_audio), NULL);
  gtk_window_set_child (GTK_WINDOW (window), button);

  gtk_window_present (GTK_WINDOW (window));
}

int
main (int    argc,
      char **argv)
{
  GtkApplication *app;
  int status;

  app = gtk_application_new ("org.gtk.example", G_APPLICATION_FLAGS_NONE);
  g_signal_connect (app, "activate", G_CALLBACK (activate), NULL);
  status = g_application_run (G_APPLICATION (app), argc, argv);
  g_object_unref (app);

  return status;
}

