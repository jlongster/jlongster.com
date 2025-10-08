ffmpeg command to generate gifs from a demo video:


```
# Adjust -ss to clip the movie to a range
# Adjust setpts to change how much it's slowed down

ffmpeg -i input.mov   \
-ss 15 -to 23 \
-vf "setpts=6*PTS,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" \
-loop 0 output.gif
```