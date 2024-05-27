CC=gcc
CFLAGS=`pkg-config --cflags gtk4`
LIBS=`pkg-config --libs gtk4`
PA_LIBS=`echo "-lpulse-simple -lpulse"`

main: main.c
	$(CC) $(CFLAGS) -o main main.c $(LIBS) $(PA_LIBS)
