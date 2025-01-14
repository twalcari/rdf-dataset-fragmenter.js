import type * as RDF from '@rdfjs/types';
import { resolve } from 'relative-to-absolute-iri';
import type { IQuadSink } from '../io/IQuadSink';
import { FragmentationBlankNodeBuffer } from './FragmentationBlankNodeBuffer';
import { FragmentationStrategyStreamAdapter } from './FragmentationStrategyStreamAdapter';

/**
 * A fragmentation strategy that places quads into their subject's document.
 */
export class FragmentationStrategySubject extends FragmentationStrategyStreamAdapter {
  private readonly blankNodeBuffer: FragmentationBlankNodeBuffer<'subject', 'object'>;
  private readonly relativePath?: string;

  // eslint-disable-next-line default-param-last
  public constructor(eagerFlushing = true, relativePath?: string) {
    super();
    this.blankNodeBuffer = new FragmentationBlankNodeBuffer('subject', 'object', eagerFlushing);
    this.relativePath = relativePath;
  }

  protected async handleQuad(quad: RDF.Quad, quadSink: IQuadSink): Promise<void> {
    // Only accept IRI subjects.
    if (quad.subject.termType === 'NamedNode') {
      // If the subject is a named node, add the quad to the subject's document.
      const baseIri = quad.subject.value.endsWith('/') ? quad.subject.value : `${quad.subject.value}/`;
      const iri = this.relativePath ? resolve(this.relativePath, baseIri) : quad.subject.value;
      await quadSink.push(iri, quad);

      // Save the subject in our blank node buffer, as it may be needed to identify documents for other quads.
      await this.blankNodeBuffer.materializeValueForNamedKey(quad.object, quad.subject, quadSink);
    }

    await this.blankNodeBuffer.push(quad, quadSink);
  }

  protected async flush(quadSink: IQuadSink): Promise<void> {
    await super.flush(quadSink);
    await this.blankNodeBuffer.flush(quadSink);
  }
}
