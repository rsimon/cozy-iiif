export interface ImageInfo {

  id: string;

  version: number;

  width: number;
  
  height: number;

  tiles: TileSpec[];

  sizes: Size[];

}

export interface Size {

  width: number;

  height: number;

}

interface TileSpec extends Size {

  scaleFactors: number[];
  
}
