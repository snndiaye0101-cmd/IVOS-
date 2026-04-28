/**
 * WorkflowStepper
 * Indicateur visuel de progression du workflow BSD (9 étapes)
 */

import React from 'react';
import { CheckCircle2, Circle, Lock } from 'lucide-react';
import {
  WORKFLOW_STEPS,
  isStepComplete,
  getCurrentStep,
  getWorkflowProgress,
  getStepBadge,
  type WorkflowStep,
} from '@/features/exploitation/services/workflowService';

interface WorkflowStepperProps {
  bsdData: any;
  currentUserRole: string;
  compactMode?: boolean; // Mode compact pour affichage dans un header
}

export default function WorkflowStepper({ bsdData, currentUserRole, compactMode = false }: WorkflowStepperProps) {
  const currentStep = getCurrentStep(bsdData);
  const progress = getWorkflowProgress(bsdData);

  if (compactMode) {
    return (
      <>
        <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="text-xs font-bold text-gray-500">PROGRESSION</div>
            <div className="flex -space-x-1">
{WORKFLOW_STEPS.map(step => {
                const complete = isStepComplete(step.step, bsdData);
                const isCurrent = step.step === currentStep;
                const badge = getStepBadge(step.step);

                return (
                  <div
                    key={step.step}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                      complete
                        ? 'bg-green-500 border-white text-white'
                        : isCurrent
                        ? `${badge.bg} border-white ${badge.color}`
                        : 'bg-gray-100 border-white text-gray-400'
                    }`}
                    title={step.label}
                  >
                    {step.step}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="h-6 w-px bg-gray-200" />

          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-green-600">{progress}%</div>
            <div className="text-xs text-gray-500">
              Étape {currentStep}/9
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Progression du Workflow</h3>
            <p className="text-sm text-gray-500">
              {progress === 100 ? 'Workflow complet ✅' : `Étape ${currentStep} sur 9 en cours`}
            </p>
          </div>
          <div className="text-4xl font-bold text-green-600">{progress}%</div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden mb-8">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {WORKFLOW_STEPS.map((step, idx) => {
            const complete = isStepComplete(step.step, bsdData);
            const isCurrent = step.step === currentStep;
            const badge = getStepBadge(step.step);
            const isLocked = step.step > currentStep;

            return (
              <div
                key={step.step}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all ${
                  complete
                    ? 'border-green-200 bg-green-50'
                    : isCurrent
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-100 bg-gray-50'
                }`}
              >
                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    complete
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? `${badge.bg} ${badge.color}`
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {complete ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : isLocked ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <span>{step.step}</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-bold text-sm ${
                      complete ? 'text-green-900' :
                      isCurrent ? 'text-blue-900' :
                      'text-gray-500'
                    }`}>
                      {step.label}
                    </h4>
                    <span className="text-xs">{badge.icon}</span>
                    {step.autoFilled && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">
                        AUTO
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${
                    complete ? 'text-green-700' :
                    isCurrent ? 'text-blue-700' :
                    'text-gray-500'
                  }`}>
                    {step.description}
                  </p>

                  {/* Role Badge */}
                  <div className="mt-2">
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${badge.bg} ${badge.color}`}>
                      {step.role === 'bureau' ? '🏢 Bureau' :
                       step.role === 'chauffeur' ? '🚛 Chauffeur' :
                       '📦 Réception'}
                    </span>
                  </div>
                </div>

                {/* Connector Line */}
                {idx < WORKFLOW_STEPS.length - 1 && (
                  <div className="absolute left-9 mt-12 h-8 w-0.5 bg-gray-200" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
