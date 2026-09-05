# Demo GIF for the README.
#
# Regenerate with:
#   vhs docs/assets/demo.tape
#
# Requires vhs (https://github.com/charmbracelet/vhs) and a `manifold` binary
# on PATH. The hidden setup below points the CLI at this checkout's templates
# so the recording matches a real install without touching your home directory.

Output docs/assets/demo.gif

Set Shell "bash"
Set FontSize 15
Set Width 1000
Set Height 730
Set Padding 20
Set Theme "Catppuccin Mocha"
Set TypingSpeed 35ms
Set PlaybackSpeed 1.0

Hide
Type "export PS1='$ ' MANIFOLD_TEMPLATES_DIR=$PWD/install/templates"
Enter
Type "export PATH=$PWD/cli:$PATH"
Enter
Type "cd $(mktemp -d) && clear"
Enter
Sleep 500ms
Show

Sleep 1s

# 1. Start a feature from a pre-built constraint set.
Type "manifold init checkout-auth --template=auth \"
Enter
Type "  --outcome='Users authenticate without session loss'"
Enter
Sleep 2s

# 2. Every constraint, and every conflict between them, before any code exists.
Type "manifold show checkout-auth | head -23"
Enter
Sleep 1s

# Hold on the unresolved tension — that is the whole point.
Sleep 6s
