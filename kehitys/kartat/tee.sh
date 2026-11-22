set -e
mkdir -p out
for f in $(node kartta.mjs); do
  google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --window-size=711,477 --screenshot=out/$f.png file://$PWD/html/$f.html >/dev/null 2>&1
  convert out/$f.png -quality 86 out/$f.jpg
done
ls -la out/*.jpg
