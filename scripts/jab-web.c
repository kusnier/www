/* Minimal browser bindings for the MIT-licensed Fraunhofer SIT JAB library.
 * Image file handling belongs to the browser; the C library sees RGBA buffers.
 */
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include "jabcode.h"

typedef struct { int status; jab_bitmap* bitmap; } encode_result;
typedef struct { int status; jab_data* data; } decode_result;

const char* version(void) { return VERSION; }

encode_result* web_write(unsigned char* input, int length, int colors, int symbols,
  int module_size, int width, int height, void* ecc, int ecc_length,
  void* versions, int versions_length, void* positions, int positions_length) {
  encode_result* result = calloc(1, sizeof(encode_result));
  if (!result) return NULL;
  result->status = 1;
  if (!input || length < 1 || length > 4096 || symbols != 1 || colors != 8) return result;
  jab_encode* encoder = createEncode(colors, symbols);
  if (!encoder) return result;
  jab_data* data = malloc(sizeof(jab_data) + length);
  if (!data) { destroyEncode(encoder); return result; }
  data->length = length;
  memcpy(data->data, input, length);
  encoder->module_size = module_size > 0 ? module_size : 8;
  result->status = generateJABCode(encoder, data);
  if (!result->status) { result->bitmap = encoder->bitmap; encoder->bitmap = NULL; }
  free(data);
  destroyEncode(encoder);
  return result;
}

decode_result* web_read(unsigned char* rgba, int width, int height) {
  decode_result* result = calloc(1, sizeof(decode_result));
  if (!result) return NULL;
  if (!rgba || width < 1 || height < 1 || width > 2000 || height > 2000) return result;
  size_t size = (size_t)width * height * 4;
  jab_bitmap* bitmap = malloc(sizeof(jab_bitmap) + size);
  if (!bitmap) return result;
  bitmap->width = width; bitmap->height = height;
  bitmap->bits_per_pixel = 32; bitmap->bits_per_channel = 8; bitmap->channel_count = 4;
  memcpy(bitmap->pixel, rgba, size);
  result->data = decodeJABCode(bitmap, NORMAL_DECODE, &result->status);
  free(bitmap);
  return result;
}

void free_jab_encode_result(encode_result* result) {
  if (result) { free(result->bitmap); free(result); }
}
void free_jab_decode_result(decode_result* result) {
  if (result) { free(result->data); free(result); }
}
