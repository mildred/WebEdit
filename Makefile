CHEERP_PREFIX=/opt/cheerp
CHEERP=$(CHEERP_PREFIX)/bin/clang -target cheerp
EMCC=emcc

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

ed25519.em.js: $(srcs)
	$(EMCC) -O3 -o $@ $+

ed25519.cheerp.js: $(srcs)
	$(CHEERP) -O3 -o $@ $+

