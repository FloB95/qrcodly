import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import vCardFactory from "vcards-js";
import {
  type TWifiInput,
  type TVCardInput,
  TQrCodeContentOriginalData,
  TQrCodeContentType,
} from "~/server/domain/types/QRcode";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function convertVCardObjToString(vCardInput: TVCardInput): string {
  const vCard = vCardFactory();

  if (vCardInput.firstName) vCard.firstName = vCardInput.firstName;
  if (vCardInput.lastName) vCard.lastName = vCardInput.lastName;
  if (vCardInput.email) vCard.email = vCardInput.email;
  if (vCardInput.phone) vCard.cellPhone = vCardInput.phone;
  if (vCardInput.fax) vCard.homeFax = vCardInput.fax;
  if (vCardInput.company) vCard.organization = vCardInput.company;
  if (vCardInput.job) vCard.title = vCardInput.job;
  if (vCardInput.street) vCard.homeAddress.street = vCardInput.street;
  if (vCardInput.city) vCard.homeAddress.city = vCardInput.city;
  if (vCardInput.zip) vCard.homeAddress.postalCode = vCardInput.zip;
  if (vCardInput.state) vCard.homeAddress.stateProvince = vCardInput.state;
  if (vCardInput.country) vCard.homeAddress.countryRegion = vCardInput.country;
  if (vCardInput.website) vCard.url = vCardInput.website;

  return vCard.getFormattedString();
}

export function convertWiFiObjToString(wiFiInput: TWifiInput): string {
  const wifiString = `WIFI:T:${wiFiInput.encryption};S:${wiFiInput.ssid};P:${wiFiInput.password};;`;
  return wifiString;
}

export const convertQRCodeDataToStringByType = (
  data: TQrCodeContentOriginalData,
  contentType: TQrCodeContentType,
): string => {
  switch (contentType) {
    case "url":
      return data as string;
    case "text":
      return data as string;
    case "wifi":
      return convertWiFiObjToString(data as TWifiInput);
    case "vCard":
      return convertVCardObjToString(data as TVCardInput);
    default:
      throw new Error("Invalid content type");
  }
};

export function toSnakeCase(str: string) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function toSnakeCaseKeys(obj: object) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [toSnakeCase(key), value]),
  );
}
