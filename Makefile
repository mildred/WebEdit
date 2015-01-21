EMCC=emcc \
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
bytecodes=$(foreach f,$(srcs),$(basename $(f)).bc)

all: ed25519.em.js ed25519.em0.js
.PHONY: all

%.em.js: %.pre.js %.post.js $(bytecodes)
	$(EMCC) -02 -o $@ --pre-js $< --post-js $(word 2,$^) $(bytecodes)

%.em0.js: %.pre.js %.post.js $(bytecodes)
	$(EMCC) -g -O0 -o $@ --pre-js $< --post-js $(word 2,$^) $(bytecodes)

%.bc: %.c
	$(EMCC) -s LINKABLE=1 -c -o $@ $+

root:
	rm -rf root
	mkdir root
	cp -R ckeditor ed25519.em.js ed25519.em0.js ed25519.em.js.mem edit.html hello.html openlink saveurl root
.PHONY: root