EMCC=emcc -O2 \
	-s EXPORTED_FUNCTIONS="['_ed25519_create_seed', '_ed25519_create_keypair', '_ed25519_sign', '_ed25519_verify', '_ed25519_add_scalar', '_ed25519_key_exchange']"
#	-DED25519_DECLSPEC=EMSCRIPTEN_KEEPALIVE

srcs= \
  ed25519/src/add_scalar.c \
  ed25519/src/ge.c \
  ed25519/src/keypair.c \
  ed25519/src/seed.c \
  ed25519/src/sign.c \
  ed25519/src/fe.c \
  ed25519/src/key_exchange.c \
  ed25519/src/sc.c \
  ed25519/src/sha512.c \
  ed25519/src/verify.c

ed25519.em.js: $(foreach f,$(srcs),$(basename $(f)).bc)
	$(EMCC) -o $@ $+

%.bc: %.c
	$(EMCC) -s LINKABLE=1 -c -o $@ $+
