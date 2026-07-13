import { Injectable, NotFoundException, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AppointmentService } from '../appointment/appointment.service';
import { CalendarService } from '../calendar/calendar.service';

@Injectable()
export class VoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendarService: CalendarService,
    @Inject(forwardRef(() => AppointmentService))
    private readonly appointmentService: AppointmentService,
  ) {}

  async getCalls(clinicId: string) {
    return this.prisma.voiceCall.findMany({
      where: { clinicId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
            preferredLanguage: true,
            tags: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getCall(clinicId: string, id: string) {
    const call = await this.prisma.voiceCall.findFirst({
      where: { id, clinicId },
      include: {
        patient: {
          include: {
            tags: true,
          },
        },
        contexts: true,
      },
    });
    if (!call) throw new NotFoundException('Call record not found');
    return call;
  }

  /**
   * Start a simulated outbound call for a patient
   */
  async startOutboundCall(clinicId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, clinicId },
      include: { tags: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    // Create call record
    const call = await this.prisma.voiceCall.create({
      data: {
        clinicId,
        patientId,
        direction: 'outbound',
        status: 'ringing',
        startedAt: new Date(),
      },
    });

    // Create initial context state
    await this.prisma.conversationContext.create({
      data: {
        callId: call.id,
        stateJson: {
          stage: 'greeting',
          doctorName: '',
          doctorId: '',
          selectedSlot: null,
          patientName: patient.name,
          primaryTag: patient.tags[0]?.tag || 'General Follow-up',
          chatHistory: [],
        },
      },
    });

    return this.getCall(clinicId, call.id);
  }

  /**
   * Interactive text interface with Niva AI Voice Agent
   */
  async interact(clinicId: string, id: string, message: string) {
    const call = await this.getCall(clinicId, id);
    if (call.status === 'completed') {
      throw new BadRequestException('Call has already ended');
    }

    const context = call.contexts[0];
    if (!context) {
      throw new BadRequestException('Call context not initialized');
    }

    const state = context.stateJson as any;
    
    // Update call status to connected if ringing
    if (call.status === 'ringing') {
      await this.prisma.voiceCall.update({
        where: { id },
        data: { status: 'connected' },
      });
    }

    // 1. Determine active doctor for patient scheduling
    if (!state.doctorId) {
      const doctor = await this.prisma.doctor.findFirst({
        where: { clinicId },
        include: { user: true },
      });
      if (doctor) {
        state.doctorId = doctor.id;
        state.doctorName = doctor.user.name;
      }
    }

    // 2. Fetch available slots for the next few days to assist scheduling
    const todayStr = new Date().toISOString().split('T')[0];
    let slots: any[] = [];
    if (state.doctorId) {
      slots = await this.calendarService.getAvailableSlots(clinicId, state.doctorId, todayStr);
      // Fallback: If no slots today, check tomorrow
      if (slots.length === 0) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        slots = await this.calendarService.getAvailableSlots(clinicId, state.doctorId, tomorrowStr);
      }
    }

    const userMessage = message.trim();
    let agentResponse = '';
    let shouldEnd = false;
    let appointmentBooked = false;
    let bookedDetails: any = null;

    // Save user response in state history
    state.chatHistory.push({ speaker: 'patient', text: userMessage });

    // 3. Clinical Dialogue State Machine Logic
    if (state.stage === 'greeting') {
      const languageText = call.patient.preferredLanguage.toLowerCase() === 'hindi' ? 
        `नमस्ते ${state.patientName}, मैं क्लिनिकएंगेज से निवा बोल रही हूँ। आपकी ${state.primaryTag} की जाँच के लिए डॉक्टर ${state.doctorName} के साथ फॉलो-अप अपॉइंटमेंट लेना है। क्या आप इसके लिए तैयार हैं?` :
        `Hello ${state.patientName}, this is Niva, your virtual care coordinator from ClinicEngage. I am calling to schedule your recommended follow-up for ${state.primaryTag} with Dr. ${state.doctorName}. Would you like to check available slots?`;

      agentResponse = languageText;
      state.stage = 'awaiting_confirmation';
    } 
    else if (state.stage === 'awaiting_confirmation') {
      const positiveIntent = /yes|yeah|sure|yup|haan|ok|okay|हाँ|हाँजी/i.test(userMessage);
      
      if (positiveIntent) {
        if (slots.length > 0) {
          const slotTimes = slots.slice(0, 3).map(s => {
            const time = new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const date = new Date(s.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' });
            return `${date} at ${time}`;
          }).join(', ');

          agentResponse = call.patient.preferredLanguage.toLowerCase() === 'hindi' ?
            `मेरे पास ये स्लॉट्स उपलब्ध हैं: ${slotTimes}। इनमें से कौन सा समय आपके लिए सही रहेगा?` :
            `Great! I have the following slots available: ${slotTimes}. Do any of these work for you?`;
          
          state.stage = 'suggesting_slots';
        } else {
          agentResponse = call.patient.preferredLanguage.toLowerCase() === 'hindi' ?
            `माफ़ कीजिये, अभी कोई स्लॉट खाली नहीं दिख रहा है। क्या मैं आपको वेटिंग लिस्ट में डाल दूँ?` :
            `I apologize, but Dr. ${state.doctorName} does not have immediate slots available. Should I add you to the calendar waitlist?`;
          state.stage = 'awaiting_waitlist';
        }
      } else {
        agentResponse = call.patient.preferredLanguage.toLowerCase() === 'hindi' ?
          `कोई बात नहीं। हम बाद में प्रयास करेंगे। धन्यवाद और अपना ख्याल रखें!` :
          `No problem at all. We will reach out later. Have a healthy day!`;
        shouldEnd = true;
      }
    } 
    else if (state.stage === 'suggesting_slots') {
      // Find matching slot from user request
      const cleanMsg = userMessage.toLowerCase();
      let matchedSlot: any = null;

      for (const slot of slots) {
        const timeStr = new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();
        const dateStr = new Date(slot.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' }).toLowerCase();
        
        // Match simple time representation (e.g. "10:00" or time string)
        if (cleanMsg.includes(timeStr) || cleanMsg.includes(timeStr.replace(' ', '')) || cleanMsg.includes('first') || cleanMsg.includes('1') || cleanMsg.includes('one')) {
          matchedSlot = slot;
          break;
        }
      }

      if (!matchedSlot && slots.length > 0) {
        matchedSlot = slots[0]; // Default to first available if they say "any time" or similar
      }

      if (matchedSlot) {
        try {
          // Perform booking database transaction
          const apt = await this.appointmentService.book(clinicId, {
            patientId: call.patientId,
            doctorId: state.doctorId,
            scheduledAt: matchedSlot.startTime,
            channel: 'voice',
          });

          appointmentBooked = true;
          bookedDetails = apt;
          state.selectedSlot = matchedSlot.startTime;

          const formattedTime = new Date(apt.scheduledAt).toLocaleString([], {
            dateStyle: 'medium',
            timeStyle: 'short',
          });

          agentResponse = call.patient.preferredLanguage.toLowerCase() === 'hindi' ?
            `बधाई हो! आपका अपॉइंटमेंट ${formattedTime} को डॉक्टर ${state.doctorName} के साथ बुक हो गया है। आपको विवरण व्हाट्सएप पर भेज दिए गए हैं।` :
            `Perfect! Your follow-up appointment is confirmed for ${formattedTime} with Dr. ${state.doctorName}. We have sent a confirmation message on WhatsApp.`;
          
          state.stage = 'confirmed';
          shouldEnd = true;
        } catch (e) {
          agentResponse = `I encountered an issue confirming that slot: ${e.message}. Let me check another time.`;
        }
      } else {
        agentResponse = `I didn't quite catch the time. Could you please specify the preferred slot again?`;
      }
    } 
    else if (state.stage === 'awaiting_waitlist') {
      const positiveWaitlist = /yes|haan|sure|waitlist|हाँ/i.test(userMessage);
      if (positiveWaitlist) {
        await this.appointmentService.joinWaitlist(clinicId, {
          patientId: call.patientId,
          doctorId: state.doctorId,
          desiredWindow: 'Next available day',
        });
        
        agentResponse = call.patient.preferredLanguage.toLowerCase() === 'hindi' ?
          `आपको वेटिंग लिस्ट में जोड़ दिया गया है। स्लॉट खाली होते ही हम सूचित करेंगे। धन्यवाद!` :
          `You have been added to the waitlist. We will notify you immediately once a slot becomes available. Thank you!`;
      } else {
        agentResponse = call.patient.preferredLanguage.toLowerCase() === 'hindi' ?
          `ठीक है, हम बाद में स्लॉट चेक करेंगे। धन्यवाद!` :
          `Understood. Have a great day!`;
      }
      shouldEnd = true;
    }
    else {
      agentResponse = `Thank you for contacting ClinicEngage. Goodbye!`;
      shouldEnd = true;
    }

    // Save agent response in history
    state.chatHistory.push({ speaker: 'niva', text: agentResponse });

    // 4. If conversation reached its logical end, complete the call
    if (shouldEnd) {
      const transcript = state.chatHistory.map((h: any) => `${h.speaker === 'patient' ? 'Patient' : 'Niva'}: ${h.text}`).join('\n');
      
      let summary = '';
      if (appointmentBooked && bookedDetails) {
        summary = `Outreach call completed successfully. Patient agreed to follow-up. Appointment successfully booked for ${new Date(bookedDetails.scheduledAt).toLocaleString()}`;
      } else {
        summary = `Outreach call completed. Patient declined or deferred scheduling at this time.`;
      }

      await this.prisma.voiceCall.update({
        where: { id },
        data: {
          status: 'completed',
          transcript,
          aiSummary: summary,
          durationSecs: Math.floor(Math.random() * 45) + 30, // 30-75 seconds
          endedAt: new Date(),
        },
      });

      // Update campaign run to responded
      const campaignRun = await this.prisma.campaignRun.findFirst({
        where: {
          patientId: call.patientId,
          status: { in: ['queued', 'sent'] },
        },
      });

      if (campaignRun) {
        await this.prisma.campaignRun.update({
          where: { id: campaignRun.id },
          data: { status: appointmentBooked ? 'responded' : 'sent' },
        });
      }

      await this.prisma.patientTimeline.create({
        data: {
          patientId: call.patientId,
          eventType: appointmentBooked ? 'OutreachResponded' : 'OutreachCallEnded',
          refId: call.id,
          metadata: {
            callId: call.id,
            summary,
            appointmentBooked,
          },
        },
      });
    }

    // Save updated context
    await this.prisma.conversationContext.update({
      where: { id: context.id },
      data: {
        stateJson: state,
      },
    });

    return {
      agentResponse,
      status: shouldEnd ? 'completed' : 'connected',
      stage: state.stage,
      appointmentBooked,
    };
  }
}
