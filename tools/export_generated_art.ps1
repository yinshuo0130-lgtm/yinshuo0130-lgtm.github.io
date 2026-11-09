param(
    [string]$Manifest = (Join-Path $PSScriptRoot '../output/imagegen/manifest.json'),
    [string]$Target = (Join-Path $PSScriptRoot '../img/px'),
    [switch]$CompileOnly
)
# Deterministic export only: samples generated source pixels, never draws sprite art.
# Manifest entries: name, source, width, height, frames (integer), opaque, fit.
# Optional: crop [x,y,w,h] (whole source); crops [[x,y,w,h],...] (absolute frame
# regions); frameSizes [[w,h],...] (exported content bounds, 0 keeps automatic);
# margin; align ('bottom'/'center'); sameScale; alphaThreshold; palette;
# maxColorsPerFrame; background; chromaKey; chromaTolerance (default 100).
# xSamples/ySamples: absolute source coordinates, one per output column/row.
# frameXSamples/frameYSamples: per-frame absolute source coordinate arrays.
# fit: 'trim', 'contain', or 'canvas' (stretch).
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
if (-not ('GeneratedArtExport' -as [type])) {
Add-Type -ReferencedAssemblies @([System.Drawing.Bitmap].Assembly.Location,[System.Drawing.Rectangle].Assembly.Location,(Join-Path $PSHOME 'ref/System.Collections.dll'),(Join-Path $PSHOME 'System.Private.Windows.GdiPlus.dll'),(Join-Path $PSHOME 'System.Private.Windows.Core.dll')) -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
public class GeneratedArtOptions {
 public int Width, Height, Frames=1, Margin=0, AlphaThreshold=128, MaxColors=0, ChromaTolerance=100;
 public bool Opaque=false, SameScale=true;
 public string Fit="trim", Align="center", Background="#FFF4DC", Palette, ChromaKey;
 public int[] Crop, XSamples, YSamples; public int[][] Crops, FrameSizes, FrameXSamples, FrameYSamples;
}
public class GeneratedArtCheck {
 public string Name, PixelFormat; public int Width,Height,Frames,Colors,TransparentPixels,PartialAlphaPixels;
 public int[][] FrameBounds; public bool LeftRightMatch,TopBottomMatch,Center8Solid;
}
public static class GeneratedArtExport {
 static Color Hex(string s) { return ColorTranslator.FromHtml(s.Trim()); }
 static bool IsKey(Color c,Color key,int tolerance) {
  return Math.Abs(c.R-key.R)<=tolerance&&Math.Abs(c.G-key.G)<=tolerance&&Math.Abs(c.B-key.B)<=tolerance;
 }
 static Color Nearest(Color c, Color[] p) {
  long best=long.MaxValue; Color chosen=p[0];
  foreach(Color q in p) { long r=c.R-q.R,g=c.G-q.G,b=c.B-q.B; long d=2*r*r+3*g*g+b*b;
   if(d<best) {best=d;chosen=q;} }
  return Color.FromArgb(255,chosen.R,chosen.G,chosen.B);
 }
 static Rectangle Rect(int[] a) { return new Rectangle(a[0],a[1],a[2],a[3]); }
 static Rectangle Bounds(Bitmap b, Rectangle box, int threshold, Color? key=null, int tolerance=0) {
  int l=box.Right,t=box.Bottom,r=box.Left-1,bot=box.Top-1;
  for(int y=box.Top;y<box.Bottom;y++) for(int x=box.Left;x<box.Right;x++) {
   Color c=b.GetPixel(x,y);
   if(c.A>=threshold&&(!key.HasValue||!IsKey(c,key.Value,tolerance))) {l=Math.Min(l,x);t=Math.Min(t,y);r=Math.Max(r,x);bot=Math.Max(bot,y);}
  }
  if(r<l) throw new Exception("An input sprite cell contains no opaque pixels.");
  return Rectangle.FromLTRB(l,t,r+1,bot+1);
 }
 static void ReduceColors(Bitmap b, Rectangle cell, int maximum, Color ink) {
  if(maximum<2) return;
  var colors=new List<int>(); var counts=new List<int>();
  for(int y=cell.Top;y<cell.Bottom;y++) for(int x=cell.Left;x<cell.Right;x++) {
   Color c=b.GetPixel(x,y); if(c.A==0||c.ToArgb()==ink.ToArgb()) continue;
   int k=colors.IndexOf(c.ToArgb()); if(k<0) {colors.Add(c.ToArgb());counts.Add(1);} else counts[k]++;
  }
  if(colors.Count+1<=maximum) return;
  var selected=new List<Color>();selected.Add(ink);
  while(selected.Count<maximum&&colors.Count>0) {
   int k=0;for(int j=1;j<counts.Count;j++) if(counts[j]>counts[k]) k=j;
   selected.Add(Color.FromArgb(colors[k])); colors.RemoveAt(k);counts.RemoveAt(k);
  }
  Color[] palette=selected.ToArray();
  for(int y=cell.Top;y<cell.Bottom;y++) for(int x=cell.Left;x<cell.Right;x++) {
   Color c=b.GetPixel(x,y); if(c.A>0) b.SetPixel(x,y,Nearest(c,palette));
  }
 }
 public static GeneratedArtCheck Export(string source,string destination,GeneratedArtOptions o) {
  if(o.Width%o.Frames!=0) throw new Exception("Output width must be divisible by frame count.");
  int fw=o.Width/o.Frames, fh=o.Height;
  string[] parts=o.Palette.Split(','); Color[] palette=new Color[parts.Length];
  for(int i=0;i<parts.Length;i++) palette[i]=Hex(parts[i]);
  using(Bitmap src=new Bitmap(source)) using(Bitmap dst=new Bitmap(o.Width,o.Height,PixelFormat.Format32bppArgb)) {
   Color? key=String.IsNullOrEmpty(o.ChromaKey)?(Color?)null:Hex(o.ChromaKey);
   if(o.XSamples!=null) {if(o.XSamples.Length!=o.Width)throw new Exception("xSamples must contain one coordinate per output column.");foreach(int x in o.XSamples)if(x<0||x>=src.Width)throw new Exception("xSamples coordinate outside source.");}
   if(o.YSamples!=null) {if(o.YSamples.Length!=o.Height)throw new Exception("ySamples must contain one coordinate per output row.");foreach(int y in o.YSamples)if(y<0||y>=src.Height)throw new Exception("ySamples coordinate outside source.");}
   Rectangle area=o.Crop!=null?Rect(o.Crop):new Rectangle(0,0,src.Width,src.Height);
   Rectangle[] boxes=new Rectangle[o.Frames]; double shared=double.MaxValue;
   for(int i=0;i<o.Frames;i++) {
    int left=area.Left+(int)Math.Floor((double)area.Width*i/o.Frames);
    int right=area.Left+(int)Math.Floor((double)area.Width*(i+1)/o.Frames);
    Rectangle cell=(o.Crops!=null&&i<o.Crops.Length&&o.Crops[i]!=null)?Rect(o.Crops[i]):Rectangle.FromLTRB(left,area.Top,right,area.Bottom);
    if(cell.Width<=0||cell.Height<=0||cell.Left<0||cell.Top<0||cell.Right>src.Width||cell.Bottom>src.Height) throw new Exception("Source crop outside image.");
    boxes[i]=o.Fit=="trim"?Bounds(src,cell,o.AlphaThreshold,key,o.ChromaTolerance):cell;
    shared=Math.Min(shared,Math.Min((double)(fw-2*o.Margin)/boxes[i].Width,(double)(fh-2*o.Margin)/boxes[i].Height));
   }
   Color background=Nearest(Hex(o.Background),palette);
   if(o.Opaque) using(Graphics g=Graphics.FromImage(dst)) g.Clear(background);
   for(int i=0;i<o.Frames;i++) {
    Rectangle box=boxes[i];
    double scale=o.SameScale?shared:Math.Min((double)(fw-2*o.Margin)/box.Width,(double)(fh-2*o.Margin)/box.Height);
    int w=o.Fit=="canvas"?fw-2*o.Margin:Math.Max(1,(int)Math.Round(box.Width*scale));
    int h=o.Fit=="canvas"?fh-2*o.Margin:Math.Max(1,(int)Math.Round(box.Height*scale));
    if(o.FrameSizes!=null&&i<o.FrameSizes.Length&&o.FrameSizes[i]!=null) {
     if(o.FrameSizes[i][0]>0) w=o.FrameSizes[i][0]; if(o.FrameSizes[i][1]>0) h=o.FrameSizes[i][1];
    }
    if(w>fw-2*o.Margin||h>fh-2*o.Margin||w<1||h<1) throw new Exception("Export content exceeds its frame.");
    int dx=i*fw+(fw-w)/2,dy=o.Align=="bottom"?fh-o.Margin-h:(fh-h)/2;
    for(int y=0;y<h;y++) for(int x=0;x<w;x++) {
     int sx=box.Left+Math.Min(box.Width-1,(int)Math.Floor((x+.5)*box.Width/w));
     int sy=box.Top+Math.Min(box.Height-1,(int)Math.Floor((y+.5)*box.Height/h));
     if(o.XSamples!=null)sx=o.XSamples[dx+x];
     if(o.YSamples!=null)sy=o.YSamples[dy+y];
     if(o.FrameXSamples!=null)sx=o.FrameXSamples[i][dx-i*fw+x];
     if(o.FrameYSamples!=null)sy=o.FrameYSamples[i][dy+y];
     if(sx<0||sx>=src.Width||sy<0||sy>=src.Height)throw new Exception("Frame sample outside source.");
     Color c=src.GetPixel(sx,sy);
     if(key.HasValue&&IsKey(c,key.Value,o.ChromaTolerance)) dst.SetPixel(dx+x,dy+y,Color.Transparent);
     else if(c.A>=o.AlphaThreshold) dst.SetPixel(dx+x,dy+y,Nearest(c,palette));
    }
    ReduceColors(dst,new Rectangle(i*fw,0,fw,fh),o.MaxColors,Hex("#1F1A24"));
   }
   dst.Save(destination,ImageFormat.Png);
  }
  return Inspect(destination,o.Frames);
 }
 public static GeneratedArtCheck Inspect(string path,int frames) {
  using(Bitmap b=new Bitmap(path)) {
   var result=new GeneratedArtCheck {Name=System.IO.Path.GetFileName(path),Width=b.Width,Height=b.Height,Frames=frames,PixelFormat=b.PixelFormat.ToString(),FrameBounds=new int[frames][]};
   var colors=new List<int>();
   for(int y=0;y<b.Height;y++) for(int x=0;x<b.Width;x++) {
    Color c=b.GetPixel(x,y);if(c.A==0)result.TransparentPixels++;else {if(c.A!=255)result.PartialAlphaPixels++;if(!colors.Contains(c.ToArgb()))colors.Add(c.ToArgb());}
   }
   result.Colors=colors.Count;int fw=b.Width/frames;
   for(int i=0;i<frames;i++) {Rectangle r=Bounds(b,new Rectangle(i*fw,0,fw,b.Height),1);result.FrameBounds[i]=new int[]{r.X-i*fw,r.Y,r.Width,r.Height};}
   result.LeftRightMatch=true;result.TopBottomMatch=true;
   for(int y=0;y<b.Height;y++) if(b.GetPixel(0,y)!=b.GetPixel(b.Width-1,y)) result.LeftRightMatch=false;
   for(int x=0;x<b.Width;x++) if(b.GetPixel(x,0)!=b.GetPixel(x,b.Height-1)) result.TopBottomMatch=false;
   result.Center8Solid=b.Width==24&&b.Height==24;
   if(result.Center8Solid) {Color c=b.GetPixel(8,8);for(int y=8;y<16;y++)for(int x=8;x<16;x++)if(b.GetPixel(x,y)!=c)result.Center8Solid=false;}
   return result;
  }
 }
 public static void Contact(string[] files,string output) {
  int cellW=600,cellH=220,rows=(files.Length+1)/2;
  using(Bitmap b=new Bitmap(cellW*2,rows*cellH,PixelFormat.Format32bppArgb)) using(Graphics g=Graphics.FromImage(b))
  using(Font font=new Font("Segoe UI",12)) using(Brush text=new SolidBrush(Color.FromArgb(31,26,36)))
  using(Brush a=new SolidBrush(Color.FromArgb(236,235,231))) using(Brush c=new SolidBrush(Color.FromArgb(216,217,213))) {
   g.Clear(Color.FromArgb(255,244,220));
   for(int i=0;i<files.Length;i++) {
    int x=i%2*cellW,y=i/2*cellH;
    using(Bitmap src=new Bitmap(files[i])) {
     g.DrawString(System.IO.Path.GetFileName(files[i])+"  "+src.Width+" x "+src.Height,font,text,x+16,y+10);
     for(int by=40;by<210;by+=10)for(int bx=10;bx<590;bx+=10)g.FillRectangle(((bx/10+by/10)%2==0)?a:c,x+bx,y+by,10,10);
     int scale=Math.Max(1,Math.Min(8,Math.Min(560/src.Width,160/src.Height)));
     g.InterpolationMode=InterpolationMode.NearestNeighbor;g.PixelOffsetMode=PixelOffsetMode.Half;
     g.DrawImage(src,new Rectangle(x+(cellW-src.Width*scale)/2,y+45+(160-src.Height*scale)/2,src.Width*scale,src.Height*scale),0,0,src.Width,src.Height,GraphicsUnit.Pixel);
    }
   }
   b.Save(output,ImageFormat.Png);
  }
 }
}
'@
}
if ($CompileOnly) { Write-Output 'Exporter compiled; no assets read or written.'; return }
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$manifestPath = [System.IO.Path]::GetFullPath($Manifest)
$outputRoot = Split-Path $manifestPath -Parent
$targetPath = [System.IO.Path]::GetFullPath($Target)
$entries = @(Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json)
if ($entries.Count -eq 0) { throw 'Empty asset manifest.' }
$backupPath = Join-Path $outputRoot 'placeholders-backup'
New-Item -ItemType Directory -Force -Path $backupPath,$targetPath | Out-Null
Get-ChildItem -LiteralPath $targetPath -Filter '*.png' | ForEach-Object {
    $backupFile = Join-Path $backupPath $_.Name
    if (-not (Test-Path -LiteralPath $backupFile)) { Copy-Item -LiteralPath $_.FullName -Destination $backupFile }
}
$palette = '#1F1A24,#3A3142,#FFF4DC,#F3E2BC,#E6CF9F,#4F9DE0,#5FA8E8,#72B6EE,#8AC6F2,#A6D6F6,#FFC83D,#D98A1C,#E5484D,#A8292E,#3A6FD8,#264696,#5BBF3A,#2E7D32,#C8763A,#8A4B22,#5E3115,#FFFFFF,#F2C29B,#D89B73,#3B2A20,#786048,#D6E8F7,#9AD27A,#4B9B3C'
$checks = @(); $files = @()
foreach ($entry in $entries) {
    $name = [string]$entry.name
    if ([System.IO.Path]::GetFileName($name) -ne $name -or -not $name.EndsWith('.png')) { throw "Invalid asset filename: $name" }
    $source = [string]$entry.source
    if (-not [System.IO.Path]::IsPathRooted($source)) { $source = Join-Path $projectRoot $source }
    if (-not (Test-Path -LiteralPath $source)) { throw "Missing generated original: $source" }
    $o = [GeneratedArtOptions]::new()
    $o.Width=[int]$entry.width; $o.Height=[int]$entry.height; $o.Palette=$palette
    if ($null -ne $entry.frames) { $o.Frames=[int]$entry.frames }
    $o.Opaque=[bool]$entry.opaque
    if ($name -eq 'runner.png') { $o.Align='bottom' }
    if ($name -eq 'icons.png') { $o.Margin=1; $o.SameScale=$false; $o.MaxColors=4 }
    if ($name -eq 'coin.png' -and $o.Frames -eq 4) { $o.FrameSizes=[int[][]]@(@(0,0),@(0,0),@(2,0),@(0,0)) }
    if ($name -eq 'avatar.png') { $o.Background='#8AC6F2' }
    if ($name -eq 'ground.png') { $o.Background='#C8763A' }
    if ($name -eq 'brick.png') { $o.Background='#8A4B22' }
    foreach ($pair in @(@('fit','Fit'),@('align','Align'),@('background','Background'),@('palette','Palette'),@('margin','Margin'),@('sameScale','SameScale'),@('alphaThreshold','AlphaThreshold'),@('maxColorsPerFrame','MaxColors'),@('chromaKey','ChromaKey'),@('chromaTolerance','ChromaTolerance'))) {
        if ($null -ne $entry.($pair[0])) { $o.($pair[1])=$entry.($pair[0]) }
    }
    if ($entry.crop) { $o.Crop=[int[]]$entry.crop }
    if ($entry.xSamples) { $o.XSamples=[int[]]$entry.xSamples }
    if ($entry.ySamples) { $o.YSamples=[int[]]$entry.ySamples }
    if ($entry.crops) { $o.Crops=[int[][]]@($entry.crops | ForEach-Object { ,([int[]]$_) }) }
    if ($entry.frameSizes) { $o.FrameSizes=[int[][]]@($entry.frameSizes | ForEach-Object { ,([int[]]$_) }) }
    if ($entry.frameXSamples) { $o.FrameXSamples=[int[][]]@($entry.frameXSamples | ForEach-Object { ,([int[]]$_) }) }
    if ($entry.frameYSamples) { $o.FrameYSamples=[int[][]]@($entry.frameYSamples | ForEach-Object { ,([int[]]$_) }) }
    $destination=Join-Path $targetPath $name
    $checks += [GeneratedArtExport]::Export($source,$destination,$o)
    $files += $destination
    Write-Output "$name exported: $($o.Width) x $($o.Height), $($o.Frames) frame(s)"
}
$checks | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $outputRoot 'validation.json') -Encoding utf8
[GeneratedArtExport]::Contact([string[]]$files,(Join-Path $outputRoot 'contact-sheet.png'))
Write-Output "Validation: $(Join-Path $outputRoot 'validation.json')"
Write-Output "Preview: $(Join-Path $outputRoot 'contact-sheet.png')"
