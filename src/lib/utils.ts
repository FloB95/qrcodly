import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import vCardFactory from "vcards-js";
import {
  type TWifiInput,
  type TVCardInput,
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
