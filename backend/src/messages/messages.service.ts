import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus, Message } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { AnnouncementDto } from './dto/announcement.dto';

// Τα στοιχεία χρήστη που εμφανίζονται δίπλα σε κάθε μήνυμα. Ποτέ passwordHash.
const userSummary = {
  select: { id: true, username: true, firstName: true, lastName: true },
} as const;

// Τι φέρνουμε μαζί με κάθε μήνυμα: αποστολέα, παραλήπτη και τίτλο event.
const messageInclude = {
  sender: userSummary,
  receiver: userSummary,
  event: { select: { id: true, title: true } },
} as const;

type UserSummary = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
};

type Contact = {
  user: UserSummary;
  event: { id: number; title: string };
  role: 'organizer' | 'attendee'; // ο ρόλος του ΑΛΛΟΥ χρήστη σε αυτό το event
};

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  // Βρίσκει κράτηση που συνδέει τους δύο χρήστες: ο ένας είναι διοργανωτής
  // του event και ο άλλος έχει κάνει κράτηση σε αυτό.
  // Δεν κοιτάμε το status της κράτησης, ώστε η επικοινωνία να συνεχίζει
  // και μετά από ακύρωση event.
  private findConnectingBooking(userA: number, userB: number, eventId?: number) {
    return this.prisma.booking.findFirst({
      where: {
        ...(eventId ? { eventId } : {}),
        OR: [
          { attendeeId: userA, event: { organizerId: userB } },
          { attendeeId: userB, event: { organizerId: userA } },
        ],
      },
      orderBy: { time: 'desc' },
    });
  }

  // Ο χρήστης βλέπει ένα μήνυμα αν είναι αποστολέας ή παραλήπτης
  // και δεν το έχει διαγράψει από τη δική του λίστα.
  private canSee(message: Message, userId: number): boolean {
    return (
      (message.senderId === userId && !message.deletedBySender) ||
      (message.receiverId === userId && !message.deletedByReceiver)
    );
  }

  async send(createMessageDto: CreateMessageDto, senderId: number) {
    if (createMessageDto.receiverId === senderId) {
      throw new BadRequestException('You cannot send a message to yourself');
    }

    const receiver = await this.prisma.user.findFirst({
      where: {
        id: createMessageDto.receiverId,
        active: true,
        registrationStatus: 'APPROVED',
      },
    });

    if (!receiver) {
      throw new NotFoundException('Receiver not found');
    }

    const booking = await this.findConnectingBooking(
      senderId,
      createMessageDto.receiverId,
      createMessageDto.eventId,
    );

    if (!booking) {
      throw new ForbiddenException(
        'You can only message users connected to you through a booking',
      );
    }

    return this.prisma.message.create({
      data: {
        senderId,
        receiverId: createMessageDto.receiverId,
        eventId: booking.eventId,   // η σύνδεση με το event διατηρείται
        bookingId: booking.id,
        subject: createMessageDto.subject,
        content: createMessageDto.content,
      },
      include: messageInclude,
    });
  }

  // Εισερχόμενα: όσα έλαβε ο χρήστης και δεν τα έχει διαγράψει, τα νεότερα πρώτα.
  findInbox(userId: number) {
    return this.prisma.message.findMany({
      where: { receiverId: userId, deletedByReceiver: false },
      include: messageInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Απεσταλμένα: όσα έστειλε ο χρήστης και δεν τα έχει διαγράψει.
  findSent(userId: number) {
    return this.prisma.message.findMany({
      where: { senderId: userId, deletedBySender: false },
      include: messageInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Για το badge νέων μηνυμάτων στο frontend.
  async countUnread(userId: number) {
    const count = await this.prisma.message.count({
      where: { receiverId: userId, isRead: false, deletedByReceiver: false },
    });

    return { count };
  }

  // 404 και όταν το μήνυμα υπάρχει αλλά δεν είναι δικό σου, ώστε να μην
  // μαθαίνει κάποιος ποια ids μηνυμάτων υπάρχουν.
  async findOne(id: number, userId: number) {
    const message = await this.prisma.message.findUnique({
      where: { id },
      include: messageInclude,
    });

    if (!message || !this.canSee(message, userId)) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  async markAsRead(id: number, userId: number) {
    const message = await this.findOne(id, userId);

    if (message.receiverId !== userId) {
      throw new ForbiddenException('Only the receiver can mark a message as read');
    }

    return this.prisma.message.update({
      where: { id },
      data: { isRead: true },
      include: messageInclude,
    });
  }

  // Soft delete: το μήνυμα κρύβεται μόνο από τη λίστα του χρήστη που το διαγράφει.
  // Ο άλλος χρήστης συνεχίζει να το βλέπει.
  async remove(id: number, userId: number): Promise<void> {
    const message = await this.findOne(id, userId);

    // Αφού δεν επιτρέπεται μήνυμα στον εαυτό σου, ο χρήστης είναι είτε μόνο
    // αποστολέας είτε μόνο παραλήπτης, άρα ξέρουμε ποια σημαία να αλλάξουμε.
    const data =
      message.senderId === userId
        ? { deletedBySender: true }
        : { deletedByReceiver: true };

    await this.prisma.message.update({ where: { id }, data });
  }

  // Οι χρήστες με τους οποίους επιτρέπεται επικοινωνία, μαζί με το event που σας συνδέει.
  async findContacts(userId: number): Promise<Contact[]> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        OR: [{ attendeeId: userId }, { event: { organizerId: userId } }],
      },
      include: {
        attendee: userSummary,
        event: { select: { id: true, title: true, organizer: userSummary } },
      },
      orderBy: { time: 'desc' },
    });

    // Κλειδί "χρήστης-event": πολλές κρατήσεις στο ίδιο event δίνουν μία επαφή.
    const contacts = new Map<string, Contact>();

    for (const booking of bookings) {
      const iAmAttendee = booking.attendeeId === userId;
      const other = iAmAttendee ? booking.event.organizer : booking.attendee;

      // ο διοργανωτής έκανε κράτηση στο δικό του event
      if (other.id === userId) continue;

      const key = `${other.id}-${booking.event.id}`;
      if (!contacts.has(key)) {
        contacts.set(key, {
          user: other,
          event: { id: booking.event.id, title: booking.event.title },
          role: iAmAttendee ? 'organizer' : 'attendee',
        });
      }
    }

    return [...contacts.values()];
  }

  // Μαζική ενημέρωση μετά από ακύρωση: ένα μήνυμα σε κάθε διαφορετικό συμμετέχοντα.
  async sendCancellationAnnouncement(
    eventId: number,
    announcementDto: AnnouncementDto,
    senderId: number,
  ) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId !== senderId) {
      throw new ForbiddenException('Only the organizer can notify the attendees');
    }

    if (event.status !== EventStatus.CANCELLED) {
      throw new BadRequestException('Announcements can only be sent for cancelled events');
    }

    // distinct: όποιος έκανε 3 κρατήσεις παίρνει 1 μήνυμα.
    // Δεν φιλτράρουμε με status, γιατί οι κρατήσεις μπορεί να έχουν γίνει ήδη CANCELLED.
    const bookings = await this.prisma.booking.findMany({
      where: { eventId, attendeeId: { not: senderId } },
      distinct: ['attendeeId'],
      select: { id: true, attendeeId: true },
    });

    await this.prisma.message.createMany({
      data: bookings.map((booking) => ({
        senderId,
        receiverId: booking.attendeeId,
        eventId,
        bookingId: booking.id,
        subject: announcementDto.subject,
        content: announcementDto.content,
      })),
    });

    return { recipients: bookings.length };
  }
}