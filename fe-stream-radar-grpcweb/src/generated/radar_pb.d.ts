import * as jspb from 'google-protobuf'



export class RadarRequest extends jspb.Message {
  getObjectCount(): number;
  setObjectCount(value: number): RadarRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RadarRequest.AsObject;
  static toObject(includeInstance: boolean, msg: RadarRequest): RadarRequest.AsObject;
  static serializeBinaryToWriter(message: RadarRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RadarRequest;
  static deserializeBinaryFromReader(message: RadarRequest, reader: jspb.BinaryReader): RadarRequest;
}

export namespace RadarRequest {
  export type AsObject = {
    objectCount: number,
  }
}

export class RadarResponse extends jspb.Message {
  getTracksList(): Array<TrackData>;
  setTracksList(value: Array<TrackData>): RadarResponse;
  clearTracksList(): RadarResponse;
  addTracks(value?: TrackData, index?: number): TrackData;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RadarResponse.AsObject;
  static toObject(includeInstance: boolean, msg: RadarResponse): RadarResponse.AsObject;
  static serializeBinaryToWriter(message: RadarResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RadarResponse;
  static deserializeBinaryFromReader(message: RadarResponse, reader: jspb.BinaryReader): RadarResponse;
}

export namespace RadarResponse {
  export type AsObject = {
    tracksList: Array<TrackData.AsObject>,
  }
}

export class TrackData extends jspb.Message {
  getTrackId(): number;
  setTrackId(value: number): TrackData;

  getLat(): number;
  setLat(value: number): TrackData;

  getLon(): number;
  setLon(value: number): TrackData;

  getAltitude(): number;
  setAltitude(value: number): TrackData;

  getSpeed(): number;
  setSpeed(value: number): TrackData;

  getHeading(): number;
  setHeading(value: number): TrackData;

  getTimestamp(): number;
  setTimestamp(value: number): TrackData;

  getClassification(): number;
  setClassification(value: number): TrackData;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TrackData.AsObject;
  static toObject(includeInstance: boolean, msg: TrackData): TrackData.AsObject;
  static serializeBinaryToWriter(message: TrackData, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TrackData;
  static deserializeBinaryFromReader(message: TrackData, reader: jspb.BinaryReader): TrackData;
}

export namespace TrackData {
  export type AsObject = {
    trackId: number,
    lat: number,
    lon: number,
    altitude: number,
    speed: number,
    heading: number,
    timestamp: number,
    classification: number,
  }
}

