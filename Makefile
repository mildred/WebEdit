EMCC=emcc
#	-DED25519_DECLSPEC=EMSCRIPTEN_KEEPALIVE

ED25519_EMCCFLAGS = -s EXPORTED_FUNCTIONS="['_ed25519_create_seed', '_ed25519_create_keypair', '_ed25519_sign', '_ed25519_verify', '_ed25519_add_scalar', '_ed25519_key_exchange']"

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

%.em.js: %.pre.js %.post.js $(BC)
	$(EMCC) $(EMCCFLAGS) $(EMCCLFLAGS) -02 -o $@ --pre-js $< --post-js $(word 2,$^) $(wordlist 3,1000,$^)

%.em0.js: %.pre.js %.post.js $(BC)
	$(EMCC) $(EMCCFLAGS) $(EMCCLFLAGS) -g -O0 -o $@ --pre-js $< --post-js $(word 2,$^) $(wordlist 3,1000,$^)

%.bc: %.c
	$(EMCC) $(EMCCFLAGS) -s LINKABLE=1 -c -o $@ $+

%.bc: %.cc
	$(EMCC) $(EMCCFLAGS) -s LINKABLE=1 -c -o $@ $+

ed25519.em.js: $(bytecodes)
ed25519.em.js: EMCCFLAGS += $(ED25519_EMCCFLAGS)
ed25519.em0.js: $(bytecodes)
ed25519.em0.js: EMCCFLAGS += $(ED25519_EMCCFLAGS)

saveurl/namesys/namesys.pb.cc saveurl/namesys/namesys.pb.h:
	cd saveurl/namesys; protoc --cpp_out=. namesys.proto

saveurl/js/extensions.min.js: pbf/dist/pbf.js lz-string/libs/lz-string.min.js
	cat $+ >$@

pbf/dist/pbf.js:
	cd pbf && npm install && npm install browserify
	cd pbf && npm run build-min

pbf/dist/pbf-dev.js:
	cd pbf && npm install && npm install browserify
	cd pbf && npm run build-dev

PLUGINS=saveurl

root:
	rm -rf $@
	mkdir $@
	cp -RL ckeditor ed25519.em.js ed25519.em0.js ed25519.em.js.mem edit.html hello.html $(PLUGINS) $@

rootl:
	rm -rf $@
	mkdir $@
	cp -R ckeditor ed25519.em.js ed25519.em0.js ed25519.em.js.mem edit.html hello.html $(PLUGINS) $@

.PHONY: root rootl