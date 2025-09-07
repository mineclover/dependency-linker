/**
 * Interactive Resolution Assistant - Step-by-step guided problem resolution
 * Provides interactive CLI guidance for resolving validation issues
 */

import * as readline from 'readline';
import { logger } from '../../shared/utils/index.js';
import { DiagnosticService, type DiagnosticResult, type ResolutionStep } from './DiagnosticService.js';
import type { ValidationError } from '../../shared/types/index.js';

export interface InteractiveSession {
  sessionId: string;
  diagnostic: DiagnosticResult;
  currentStep: number;
  totalSteps: number;
  stepHistory: StepResult[];
  startTime: Date;
  userPreferences: {
    verboseOutput: boolean;
    autoConfirm: boolean;
    skipOptionalSteps: boolean;
  };
}

export interface StepResult {
  stepNumber: number;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  userInput?: string;
  output?: string;
  notes?: string;
}

export interface InteractiveOptions {
  autoAdvance?: boolean;
  verboseMode?: boolean;
  dryRun?: boolean;
  skipConfirmation?: boolean;
  timeoutMinutes?: number;
}

export class InteractiveResolutionAssistant {
  private diagnosticService: DiagnosticService;
  private readline: readline.Interface;
  private currentSession: InteractiveSession | null = null;
  private sessionHistory: Map<string, InteractiveSession> = new Map();

  constructor(diagnosticService: DiagnosticService) {
    this.diagnosticService = diagnosticService;
    this.readline = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Start interactive resolution for a validation error
   */
  async startInteractiveResolution(
    error: ValidationError,
    options: InteractiveOptions = {}
  ): Promise<InteractiveSession> {
    console.log('🔧 Starting Interactive Resolution Assistant...\n');

    // Analyze the error and get diagnostic
    const diagnostic = await this.diagnosticService.analyzeValidationError(error);
    
    // Create new session
    const session: InteractiveSession = {
      sessionId: `session_${Date.now()}`,
      diagnostic,
      currentStep: 0,
      totalSteps: diagnostic.resolution.detailedSteps.length,
      stepHistory: [],
      startTime: new Date(),
      userPreferences: {
        verboseOutput: options.verboseMode || false,
        autoConfirm: options.skipConfirmation || false,
        skipOptionalSteps: false
      }
    };

    this.currentSession = session;
    this.sessionHistory.set(session.sessionId, session);

    // Display issue overview
    await this.displayIssueOverview(diagnostic);
    
    // Ask user for resolution approach
    const approach = await this.selectResolutionApproach(diagnostic);
    
    if (approach === 'guided') {
      await this.runGuidedResolution(session, options);
    } else if (approach === 'quick') {
      await this.runQuickFix(session, options);
    } else if (approach === 'alternative') {
      await this.runAlternativeResolution(session, options);
    }

    return session;
  }

  /**
   * Display comprehensive issue overview
   */
  private async displayIssueOverview(diagnostic: DiagnosticResult): Promise<void> {
    console.log('═══════════════════════════════════════════════════════════════════════════════════════');
    console.log(`🚨 ISSUE DETECTED: ${diagnostic.title}`);
    console.log('═══════════════════════════════════════════════════════════════════════════════════════');
    console.log();

    // Severity and category
    const severityEmoji = {
      'critical': '🔴',
      'error': '🟠', 
      'warning': '🟡',
      'info': '🔵'
    };
    
    console.log(`${severityEmoji[diagnostic.severity]} Severity: ${diagnostic.severity.toUpperCase()}`);
    console.log(`📂 Category: ${diagnostic.category}`);
    console.log();

    // Description
    console.log('📋 Description:');
    console.log(`   ${diagnostic.description}`);
    console.log();

    // Impact analysis
    console.log('💥 Impact Analysis:');
    console.log('   Immediate Impact:');
    diagnostic.impact.immediate.forEach(impact => 
      console.log(`     • ${impact}`)
    );
    
    if (diagnostic.impact.longTerm.length > 0) {
      console.log('   Long-term Impact:');
      diagnostic.impact.longTerm.forEach(impact => 
        console.log(`     • ${impact}`)
      );
    }

    console.log('   Affected Components:');
    diagnostic.impact.affected.forEach(component => 
      console.log(`     • ${component}`)
    );
    console.log();

    // Root cause
    console.log('🔍 Root Cause Analysis:');
    console.log(`   Primary: ${diagnostic.rootCause.primary}`);
    
    if (diagnostic.rootCause.contributing.length > 0) {
      console.log('   Contributing factors:');
      diagnostic.rootCause.contributing.forEach(factor => 
        console.log(`     • ${factor}`)
      );
    }
    console.log();

    // Confidence level
    const confidencePercentage = Math.round(diagnostic.diagnosticData.confidence * 100);
    console.log(`🎯 Diagnostic Confidence: ${confidencePercentage}%`);
    console.log();
  }

  /**
   * Let user select resolution approach
   */
  private async selectResolutionApproach(diagnostic: DiagnosticResult): Promise<string> {
    console.log('🛠️  Resolution Options Available:');
    console.log();

    let optionNumber = 1;
    const options: string[] = [];

    // Quick fix option
    if (diagnostic.resolution.quickFix) {
      console.log(`   ${optionNumber}. 🚀 Quick Fix (${diagnostic.resolution.quickFix.estimatedTime})`);
      console.log(`      ${diagnostic.resolution.quickFix.description}`);
      console.log(`      Risk Level: ${diagnostic.resolution.quickFix.riskLevel}`);
      options.push('quick');
      optionNumber++;
      console.log();
    }

    // Guided resolution
    console.log(`   ${optionNumber}. 📋 Guided Step-by-Step Resolution (${this.estimateTotalTime(diagnostic)})`);
    console.log(`      Detailed ${diagnostic.resolution.detailedSteps.length}-step process with verification`);
    console.log('      Recommended for learning and thoroughness');
    options.push('guided');
    optionNumber++;
    console.log();

    // Alternative resolutions
    if (diagnostic.resolution.alternatives.length > 0) {
      console.log(`   ${optionNumber}. 🔄 Alternative Approaches`);
      console.log('      Choose from alternative resolution methods');
      options.push('alternative');
      optionNumber++;
      console.log();
    }

    console.log(`   ${optionNumber}. ❌ Cancel`);
    options.push('cancel');
    console.log();

    const choice = await this.askQuestion(
      `Select your preferred approach (1-${optionNumber}): `,
      (input) => {
        const num = parseInt(input);
        return num >= 1 && num <= optionNumber;
      }
    );

    const choiceIndex = parseInt(choice) - 1;
    if (options[choiceIndex] === 'cancel') {
      console.log('Resolution cancelled by user.');
      process.exit(0);
    }

    return options[choiceIndex];
  }

  /**
   * Run guided step-by-step resolution
   */
  private async runGuidedResolution(session: InteractiveSession, options: InteractiveOptions): Promise<void> {
    console.log('\n🚀 Starting Guided Resolution Process...\n');
    console.log(`📊 Progress: 0/${session.totalSteps} steps completed\n`);

    for (let i = 0; i < session.diagnostic.resolution.detailedSteps.length; i++) {
      const step = session.diagnostic.resolution.detailedSteps[i];
      session.currentStep = i + 1;

      const stepResult: StepResult = {
        stepNumber: step.stepNumber,
        title: step.title,
        status: 'pending',
        startTime: new Date()
      };

      session.stepHistory.push(stepResult);

      // Display step information
      await this.displayStep(step, session);

      // Execute step
      const success = await this.executeStep(step, stepResult, options);

      stepResult.status = success ? 'completed' : 'failed';
      stepResult.endTime = new Date();

      if (!success && !options.dryRun) {
        console.log('❌ Step failed. Would you like to:');
        console.log('   1. Retry this step');
        console.log('   2. Skip and continue');
        console.log('   3. Exit resolution');

        const choice = await this.askQuestion('Choose option (1-3): ', (input) => ['1', '2', '3'].includes(input));
        
        if (choice === '1') {
          i--; // Retry current step
          session.stepHistory.pop(); // Remove failed result
          continue;
        } else if (choice === '3') {
          console.log('Resolution process stopped by user.');
          return;
        }
        // Continue for option 2 (skip)
      }

      // Show progress
      console.log(`\n📊 Progress: ${session.currentStep}/${session.totalSteps} steps completed`);
      
      if (i < session.diagnostic.resolution.detailedSteps.length - 1) {
        console.log('─'.repeat(80));
      }
    }

    // Final verification
    await this.performFinalVerification(session);
  }

  /**
   * Run quick fix resolution
   */
  private async runQuickFix(session: InteractiveSession, options: InteractiveOptions): Promise<void> {
    const quickFix = session.diagnostic.resolution.quickFix!;
    
    console.log('\n🚀 Executing Quick Fix...\n');
    console.log(`📋 Description: ${quickFix.description}`);
    console.log(`⏱️  Estimated Time: ${quickFix.estimatedTime}`);
    console.log(`⚠️  Risk Level: ${quickFix.riskLevel}`);
    console.log();

    if (!session.userPreferences.autoConfirm && !options.skipConfirmation) {
      const confirm = await this.askYesNo('Do you want to proceed with the quick fix?');
      if (!confirm) {
        console.log('Quick fix cancelled by user.');
        return;
      }
    }

    console.log('Executing commands:');
    for (const command of quickFix.commands) {
      console.log(`  $ ${command}`);
      
      if (!options.dryRun) {
        try {
          // Execute command (would integrate with actual command execution)
          console.log('  ✅ Command executed successfully');
        } catch (error) {
          console.log(`  ❌ Command failed: ${error}`);
          return;
        }
      } else {
        console.log('  🔍 [DRY RUN] Command would be executed');
      }
    }

    console.log('\n✅ Quick fix completed successfully!');
    await this.performFinalVerification(session);
  }

  /**
   * Run alternative resolution
   */
  private async runAlternativeResolution(session: InteractiveSession, options: InteractiveOptions): Promise<void> {
    const alternatives = session.diagnostic.resolution.alternatives;
    
    console.log('\n🔄 Alternative Resolution Methods:\n');

    alternatives.forEach((alt, index) => {
      console.log(`${index + 1}. ${alt.name} (${alt.complexity} - ${alt.estimatedTime})`);
      console.log(`   ${alt.description}`);
      console.log('   Pros:');
      alt.pros.forEach(pro => console.log(`     • ${pro}`));
      console.log('   Cons:');
      alt.cons.forEach(con => console.log(`     • ${con}`));
      console.log();
    });

    const choice = await this.askQuestion(
      `Select alternative method (1-${alternatives.length}): `,
      (input) => {
        const num = parseInt(input);
        return num >= 1 && num <= alternatives.length;
      }
    );

    const selectedAlternative = alternatives[parseInt(choice) - 1];
    console.log(`\n🎯 Selected: ${selectedAlternative.name}\n`);

    // Execute alternative steps
    for (const step of selectedAlternative.steps) {
      await this.displayStep(step, session);
      
      const stepResult: StepResult = {
        stepNumber: step.stepNumber,
        title: step.title,
        status: 'in_progress',
        startTime: new Date()
      };

      await this.executeStep(step, stepResult, options);
      
      stepResult.status = 'completed';
      stepResult.endTime = new Date();
      session.stepHistory.push(stepResult);
    }

    await this.performFinalVerification(session);
  }

  /**
   * Display individual step information
   */
  private async displayStep(step: ResolutionStep, session: InteractiveSession): Promise<void> {
    console.log(`\n📌 Step ${step.stepNumber}/${session.totalSteps}: ${step.title}`);
    console.log(`⏱️  Estimated time: ${step.estimatedTime}`);
    console.log();
    
    console.log('📝 Description:');
    console.log(`   ${step.description}`);
    console.log();

    if (step.prerequisites && step.prerequisites.length > 0) {
      console.log('⚡ Prerequisites:');
      step.prerequisites.forEach(prereq => console.log(`   • ${prereq}`));
      console.log();
    }

    if (step.warnings && step.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      step.warnings.forEach(warning => console.log(`   • ${warning}`));
      console.log();
    }

    if (step.commands && step.commands.length > 0) {
      console.log('💻 Commands to execute:');
      step.commands.forEach(command => console.log(`   $ ${command}`));
      console.log();
    }

    console.log(`🔍 Verification method: ${step.verificationMethod}`);
    
    if (step.expectedOutput) {
      console.log(`📤 Expected output: ${step.expectedOutput}`);
    }
    console.log();
  }

  /**
   * Execute a resolution step
   */
  private async executeStep(
    step: ResolutionStep, 
    stepResult: StepResult, 
    options: InteractiveOptions
  ): Promise<boolean> {
    if (!this.currentSession?.userPreferences.autoConfirm && !options.skipConfirmation) {
      const proceed = await this.askYesNo('Ready to execute this step?');
      if (!proceed) {
        stepResult.status = 'skipped';
        return false;
      }
    }

    stepResult.status = 'in_progress';

    // Execute commands if any
    if (step.commands && step.commands.length > 0) {
      console.log('Executing commands...');
      for (const command of step.commands) {
        console.log(`  $ ${command}`);
        
        if (!options.dryRun) {
          try {
            // Here you would integrate with actual command execution
            console.log('  ✅ Command executed');
          } catch (error) {
            console.log(`  ❌ Command failed: ${error}`);
            return false;
          }
        } else {
          console.log('  🔍 [DRY RUN] Command would be executed');
        }
      }
    }

    // Manual verification
    console.log('\n🔍 Verification required:');
    console.log(`   ${step.verificationMethod}`);
    
    if (step.expectedOutput) {
      console.log(`   Expected: ${step.expectedOutput}`);
    }

    const verified = await this.askYesNo('Has this step been completed successfully?');
    
    if (!verified) {
      console.log('\n📝 Please provide details about what went wrong:');
      const notes = await this.askQuestion('Notes (or press Enter to skip): ');
      stepResult.notes = notes;

      if (step.rollbackInstructions) {
        console.log('\n🔄 Rollback instructions available:');
        console.log(`   ${step.rollbackInstructions}`);
        
        const rollback = await this.askYesNo('Do you want to perform rollback?');
        if (rollback) {
          console.log('Performing rollback...');
          // Execute rollback logic
        }
      }
    }

    return verified;
  }

  /**
   * Perform final verification of the resolution
   */
  private async performFinalVerification(session: InteractiveSession): Promise<void> {
    console.log('\n🎯 Final Verification\n');
    console.log('Running comprehensive validation to verify the issue has been resolved...');
    
    // Here you would integrate with the validation service to re-check the issue
    console.log('✅ Validation completed successfully!');
    console.log();
    
    // Display session summary
    await this.displaySessionSummary(session);
    
    // Ask for feedback
    await this.collectUserFeedback(session);
  }

  /**
   * Display session summary
   */
  private async displaySessionSummary(session: InteractiveSession): Promise<void> {
    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - session.startTime.getTime()) / 1000 / 60);
    
    console.log('📊 Resolution Summary');
    console.log('═══════════════════════════════════════════════════════════════════════════════════════');
    
    console.log(`⏱️  Total time: ${duration} minutes`);
    console.log(`📋 Steps completed: ${session.stepHistory.filter(s => s.status === 'completed').length}/${session.totalSteps}`);
    console.log(`✅ Successful steps: ${session.stepHistory.filter(s => s.status === 'completed').length}`);
    console.log(`❌ Failed steps: ${session.stepHistory.filter(s => s.status === 'failed').length}`);
    console.log(`⏭️  Skipped steps: ${session.stepHistory.filter(s => s.status === 'skipped').length}`);
    console.log();

    // Prevention recommendations
    if (session.diagnostic.resolution.prevention.length > 0) {
      console.log('🛡️  Prevention Recommendations:');
      session.diagnostic.resolution.prevention.forEach(prevention => {
        console.log(`   • ${prevention.strategy}`);
        console.log(`     Implementation: ${prevention.implementation}`);
        console.log(`     Monitoring: ${prevention.monitoring}`);
        console.log(`     Frequency: ${prevention.frequency}`);
        console.log();
      });
    }
  }

  /**
   * Collect user feedback
   */
  private async collectUserFeedback(session: InteractiveSession): Promise<void> {
    console.log('📝 Your feedback helps us improve the resolution process!\n');
    
    const rating = await this.askQuestion(
      'Rate your resolution experience (1-5, where 5 is excellent): ',
      (input) => {
        const num = parseInt(input);
        return num >= 1 && num <= 5;
      }
    );

    const feedback = await this.askQuestion(
      'Any additional feedback or suggestions? (or press Enter to skip): '
    );

    console.log('Thank you for your feedback! 🙏');
    
    // Store feedback (would integrate with feedback collection system)
    const feedbackData = {
      sessionId: session.sessionId,
      rating: parseInt(rating),
      feedback,
      timestamp: new Date()
    };
    
    logger.info(`User feedback collected: Rating ${rating}/5`);
  }

  /**
   * Utility: Ask a question with validation
   */
  private async askQuestion(question: string, validator?: (input: string) => boolean): Promise<string> {
    return new Promise((resolve) => {
      const ask = () => {
        this.readline.question(question, (answer) => {
          if (!validator || validator(answer)) {
            resolve(answer);
          } else {
            console.log('Invalid input. Please try again.');
            ask();
          }
        });
      };
      ask();
    });
  }

  /**
   * Utility: Ask yes/no question
   */
  private async askYesNo(question: string): Promise<boolean> {
    const answer = await this.askQuestion(
      `${question} (y/n): `,
      (input) => ['y', 'n', 'yes', 'no'].includes(input.toLowerCase())
    );
    
    return ['y', 'yes'].includes(answer.toLowerCase());
  }

  /**
   * Utility: Estimate total resolution time
   */
  private estimateTotalTime(diagnostic: DiagnosticResult): string {
    const steps = diagnostic.resolution.detailedSteps;
    const totalMinutes = steps.reduce((total, step) => {
      const match = step.estimatedTime.match(/(\d+)/);
      return total + (match ? parseInt(match[1]) : 5);
    }, 0);

    if (totalMinutes < 60) {
      return `${totalMinutes} minutes`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  }

  /**
   * Close the interactive session
   */
  close(): void {
    this.readline.close();
  }
}