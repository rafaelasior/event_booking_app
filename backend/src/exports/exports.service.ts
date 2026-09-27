import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ExportEvent = {
  EventID: string;
  Title: string;
  Category: string[];
  EventType: string;
  Venue: string;
  Address: string;
  City: string;
  Country: string;
  GeoLocation?: { Latitude: number; Longitude: number };
  StartDateTime: string;
  EndDateTime: string;
  Capacity: number;
  TicketTypes: { TicketTypeID: string; Name: string; Price: string; Quantity: number; Available: number }[];
  Bookings: {
    BookingID: string;
    Attendee: { UserID: string };
    Time: string;
    TicketTypeRef: string;
    NumberOfTickets: number;
    TotalCost: string;
    BookingStatus: string;
  }[];
  Organizer: { UserID: string };
  Status: string;
  Description: string;
  Media?: string[];
};

//DTD
const EVENTS_DTD=`<!ELEMENT Events (Event*)>
<!ELEMENT Event (Title, Category+, EventType, Venue, Address, City,
Country, GeoLocation?, StartDateTime, EndDateTime, Capacity,
TicketTypes, Bookings, Organizer, Status, Description, Media?)>
<!ATTLIST Event EventID CDATA #REQUIRED>
<!ELEMENT Title (#PCDATA)>
<!ELEMENT Category (#PCDATA)>
<!ELEMENT EventType (#PCDATA)>
<!ELEMENT Venue (#PCDATA)>
<!ELEMENT Address (#PCDATA)>
<!ELEMENT City (#PCDATA)>
<!ELEMENT Country (#PCDATA)>
<!ELEMENT GeoLocation EMPTY>
<!ATTLIST GeoLocation Latitude CDATA #REQUIRED Longitude CDATA #REQUIRED>
<!ELEMENT StartDateTime (#PCDATA)>
<!ELEMENT EndDateTime (#PCDATA)>
<!ELEMENT Capacity (#PCDATA)>
<!ELEMENT TicketTypes (TicketType+)>
<!ELEMENT TicketType (Name, Price, Quantity, Available)>
<!ATTLIST TicketType TicketTypeID CDATA #REQUIRED>
<!ELEMENT Name (#PCDATA)>
<!ELEMENT Price (#PCDATA)>
<!ELEMENT Quantity (#PCDATA)>
<!ELEMENT Available (#PCDATA)>
<!ELEMENT Bookings (Booking*)>
<!ELEMENT Booking (Attendee, Time, TicketTypeRef, NumberOfTickets,
TotalCost, BookingStatus)>
<!ATTLIST Booking BookingID CDATA #REQUIRED>
<!ELEMENT Attendee EMPTY>
<!ATTLIST Attendee UserID CDATA #REQUIRED>
<!ELEMENT Time (#PCDATA)>
<!ELEMENT TicketTypeRef (#PCDATA)>
<!ELEMENT NumberOfTickets (#PCDATA)>
<!ELEMENT TotalCost (#PCDATA)>
<!ELEMENT BookingStatus (#PCDATA)>
<!ELEMENT Organizer EMPTY>
<!ATTLIST Organizer UserID CDATA #REQUIRED>
<!ELEMENT Status (#PCDATA)>
<!ELEMENT Description (#PCDATA)>
<!ELEMENT Media (Photo*)>
<!ELEMENT Photo (#PCDATA)>`;

// Το & πρέπει να αντικατασταθεί πρώτο.
function esc(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  async exportXml(): Promise<string> {
    const events = await this.loadEvents();
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<!DOCTYPE Events [\n${EVENTS_DTD}\n]>`,
      '<Events>',
      ...events.map((e) => this.eventToXml(e)),
      '</Events>',
    ].join('\n');
  }

  async exportJson(): Promise<{ Events: ExportEvent[] }> {
    return { Events: await this.loadEvents() };
  }

  private async loadEvents(): Promise<ExportEvent[]> {
    const events = await this.prisma.event.findMany({
      // Το DTD θέλει Category+ και TicketType+.
      where: { eventCategories: { some: {} }, ticketTypes: { some: {} } },
      orderBy: { id: 'asc' },
      include: {
        organizer: { select: { username: true } },
        eventCategories: { include: { category: true } },
        ticketTypes: { orderBy: { id: 'asc' } },
        bookings: {
          orderBy: { id: 'asc' },
          include: { attendee: { select: { username: true } } },
        },
        photos: { orderBy: { id: 'asc' } },
      },
    });

    return events.map((e) => ({
      EventID: String(e.id),
      Title: e.title,
      Category: e.eventCategories.map((ec) => ec.category.name),
      EventType: e.eventType,
      Venue: e.venue,
      Address: e.address,
      City: e.city,
      Country: e.country,
      GeoLocation:
        e.latitude != null && e.longitude != null
          ? { Latitude: e.latitude, Longitude: e.longitude }
          : undefined,
      StartDateTime: e.startDateTime.toISOString(),
      EndDateTime: e.endDateTime.toISOString(),
      Capacity: e.capacity,
      TicketTypes: e.ticketTypes.map((t) => ({
        TicketTypeID: String(t.id),
        Name: t.name,
        Price: t.price.toFixed(2),
        Quantity: t.quantity,
        Available: t.available,
      })),
      Bookings: e.bookings.map((b) => ({
        BookingID: String(b.id),
        Attendee: { UserID: b.attendee.username },
        Time: b.time.toISOString(),
        TicketTypeRef: String(b.ticketTypeId),
        NumberOfTickets: b.numberOfTickets,
        TotalCost: b.totalCost.toFixed(2),
        BookingStatus: b.status,
      })),
      Organizer: { UserID: e.organizer.username },
      Status: e.status,
      Description: e.description,
      Media: e.photos.length > 0 ? e.photos.map((p) => p.filePath) : undefined,
    }));
  }

  // Η σειρά των στοιχείων ακολουθεί το DTD.
  private eventToXml(e: ExportEvent): string {
    const lines: string[] = [];

    lines.push(`  <Event EventID="${esc(e.EventID)}">`);
    lines.push(`    <Title>${esc(e.Title)}</Title>`);
    for (const category of e.Category) {
      lines.push(`    <Category>${esc(category)}</Category>`);
    }
    lines.push(`    <EventType>${esc(e.EventType)}</EventType>`);
    lines.push(`    <Venue>${esc(e.Venue)}</Venue>`);
    lines.push(`    <Address>${esc(e.Address)}</Address>`);
    lines.push(`    <City>${esc(e.City)}</City>`);
    lines.push(`    <Country>${esc(e.Country)}</Country>`);
    if (e.GeoLocation) {
      lines.push(
        `    <GeoLocation Latitude="${e.GeoLocation.Latitude}" Longitude="${e.GeoLocation.Longitude}"/>`,
      );
    }
    lines.push(`    <StartDateTime>${e.StartDateTime}</StartDateTime>`);
    lines.push(`    <EndDateTime>${e.EndDateTime}</EndDateTime>`);
    lines.push(`    <Capacity>${e.Capacity}</Capacity>`);

    lines.push('    <TicketTypes>');
    for (const t of e.TicketTypes) {
      lines.push(`      <TicketType TicketTypeID="${esc(t.TicketTypeID)}">`);
      lines.push(`        <Name>${esc(t.Name)}</Name>`);
      lines.push(`        <Price>${t.Price}</Price>`);
      lines.push(`        <Quantity>${t.Quantity}</Quantity>`);
      lines.push(`        <Available>${t.Available}</Available>`);
      lines.push('      </TicketType>');
    }
    lines.push('    </TicketTypes>');

    lines.push('    <Bookings>');
    for (const b of e.Bookings) {
      lines.push(`      <Booking BookingID="${esc(b.BookingID)}">`);
      lines.push(`        <Attendee UserID="${esc(b.Attendee.UserID)}"/>`);
      lines.push(`        <Time>${b.Time}</Time>`);
      lines.push(`        <TicketTypeRef>${esc(b.TicketTypeRef)}</TicketTypeRef>`);
      lines.push(`        <NumberOfTickets>${b.NumberOfTickets}</NumberOfTickets>`);
      lines.push(`        <TotalCost>${b.TotalCost}</TotalCost>`);
      lines.push(`        <BookingStatus>${b.BookingStatus}</BookingStatus>`);
      lines.push('      </Booking>');
    }
    lines.push('    </Bookings>');

    lines.push(`    <Organizer UserID="${esc(e.Organizer.UserID)}"/>`);
    lines.push(`    <Status>${e.Status}</Status>`);
    lines.push(`    <Description>${esc(e.Description)}</Description>`);
    if (e.Media) {
      lines.push('    <Media>');
      for (const photo of e.Media) {
        lines.push(`      <Photo>${esc(photo)}</Photo>`);
      }
      lines.push('    </Media>');
    }
    lines.push('  </Event>');

    return lines.join('\n');
  }
}
